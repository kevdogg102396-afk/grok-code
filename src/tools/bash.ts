import { registerTool } from './registry.js';

registerTool({
  name: 'bash',
  description: 'Execute a shell command and return stdout/stderr. Use for running scripts, git commands, build tools, etc.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds (default: 120000)' },
    },
    required: ['command'],
  },
  async execute(args, context) {
    const { command, timeout = 120000 } = args;
    try {
      // Strip credentials from the child environment before spawning bash.
      // Prevents a prompt-injected command like `echo "$XAI_<key-suffix>"` from
      // exfiltrating the agent's own API keys or other ambient credentials.
      // Single source of truth: filter by NAME patterns, not an enumerated list.
      const CRED_NAME_RE = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE)/i;
      const AWS_RE = /^AWS_/i;
      const safeEnv: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(process.env)) {
        if (CRED_NAME_RE.test(k)) continue;
        if (AWS_RE.test(k)) continue;
        safeEnv[k] = v;
      }
      safeEnv.HOME = process.env.HOME || process.env.USERPROFILE;

      const proc = Bun.spawn(['bash', '-c', command], {
        cwd: context.cwd,
        env: safeEnv,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Race between process completion and timeout
      let timedOut = false;
      const timeoutId = timeout > 0 ? setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeout) : null;

      // Also respect agent-level abort signal (e.g. outer tool timeout)
      const onAbort = () => { proc.kill(); };
      if (context.signal) {
        if (context.signal.aborted) proc.kill();
        else context.signal.addEventListener('abort', onAbort, { once: true });
      }

      // Read stdout and stderr concurrently
      const [stdoutBuf, stderrBuf] = await Promise.all([
        new Response(proc.stdout).arrayBuffer(),
        new Response(proc.stderr).arrayBuffer(),
      ]);

      const exitCode = await proc.exited;
      if (timeoutId) clearTimeout(timeoutId);
      if (context.signal) context.signal.removeEventListener('abort', onAbort);

      if (timedOut) {
        return { output: '', error: `Command timed out after ${timeout}ms` };
      }

      const stdout = new TextDecoder().decode(stdoutBuf).trim();
      const stderr = new TextDecoder().decode(stderrBuf).trim();

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + `STDERR: ${stderr}`;
      if (!output) output = `(no output, exit code: ${exitCode})`;

      return {
        title: `bash: ${command.slice(0, 60)}`,
        output: output.slice(0, 100000),
        error: exitCode !== 0 ? `Exit code: ${exitCode}` : undefined,
      };
    } catch (err: any) {
      return { output: '', error: `Command failed: ${err.message}` };
    }
  },
});
