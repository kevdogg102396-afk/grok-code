#!/bin/bash
# Grok-Code splash screen by ClawdWorks

CYAN='\033[0;36m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
YELLOW='\033[1;33m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${YELLOW}  ★    ✦       ★          ✦        ★       ✦      ★${RESET}"
echo -e "${YELLOW}     ✦          ★         ✦           ★             ✦${RESET}"
echo ""
echo -e "${WHITE}${BOLD}   ██████╗ ██████╗  ██████╗ ██╗  ██╗${RESET}"
echo -e "${WHITE}${BOLD}  ██╔════╝ ██╔══██╗██╔═══██╗██║ ██╔╝${RESET}"
echo -e "${WHITE}${BOLD}  ██║  ███╗██████╔╝██║   ██║█████╔╝ ${RESET}"
echo -e "${WHITE}${BOLD}  ██║   ██║██╔══██╗██║   ██║██╔═██╗ ${RESET}"
echo -e "${WHITE}${BOLD}  ╚██████╔╝██║  ██║╚██████╔╝██║  ██╗${RESET}"
echo -e "${WHITE}${BOLD}   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝${RESET}"
echo ""
echo -e "${WHITE}${BOLD}   ██████╗ ██████╗ ██████╗ ███████╗${RESET}"
echo -e "${WHITE}${BOLD}  ██╔════╝██╔═══██╗██╔══██╗██╔════╝${RESET}"
echo -e "${WHITE}${BOLD}  ██║     ██║   ██║██║  ██║█████╗  ${RESET}"
echo -e "${WHITE}${BOLD}  ██║     ██║   ██║██║  ██║██╔══╝  ${RESET}"
echo -e "${WHITE}${BOLD}  ╚██████╗╚██████╔╝██████╔╝███████╗${RESET}"
echo -e "${WHITE}${BOLD}   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝${RESET}"
echo ""
echo -e "${CYAN}${BOLD}          by  C l a w d W o r k s${RESET}"
echo ""
echo -e "${DIM}     AI coding agent powered by xAI's Grok models.${RESET}"
echo ""
echo -e "${YELLOW}  ★    ✦       ★          ✦        ★       ✦      ★${RESET}"
echo ""
echo -e "  ${WHITE}Model:${RESET}   ${CYAN}${GROK_MODEL:-grok-4-1-fast}${RESET}"
echo -e "  ${WHITE}Tokens:${RESET}  ${CYAN}${GROK_MAX_TOKENS:-16384}${RESET}"
echo -e "  ${WHITE}Mode:${RESET}    ${CYAN}${GROK_MODE:-Local}${RESET}"
echo ""
echo -e "${DIM}  ────────────────────────────────────────────────────────${RESET}"
echo ""
