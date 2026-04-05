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
      const proc = Bun.spawn(['bash', '-c', command], {
        cwd: context.cwd,
        env: { ...process.env, HOME: process.env.HOME || process.env.USERPROFILE },
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Race between process completion and timeout
      let timedOut = false;
      const timeoutId = timeout > 0 ? setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeout) : null;

      // Read stdout and stderr concurrently
      const [stdoutBuf, stderrBuf] = await Promise.all([
        new Response(proc.stdout).arrayBuffer(),
        new Response(proc.stderr).arrayBuffer(),
      ]);

      const exitCode = await proc.exited;
      if (timeoutId) clearTimeout(timeoutId);

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
