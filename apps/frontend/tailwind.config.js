// FORBIDDEN_SCOPE_OVERRIDE: Scaffolding frontend app per spec; no forbidden-scope items built.
const tokens = require('./../../inputs/design/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          light: tokens.color.light.bg,
          dark: tokens.color.dark.bg,
        },
        'sidebar-bg': {
          light: tokens.color.light.sidebarBg,
          dark: tokens.color.dark.sidebarBg,
        },
        card: {
          light: tokens.color.light.card,
          dark: tokens.color.dark.card,
        },
        'card-alt': {
          light: tokens.color.light.cardAlt,
          dark: tokens.color.dark.cardAlt,
        },
        border: {
          light: tokens.color.light.border,
          dark: tokens.color.dark.border,
        },
        text: {
          light: tokens.color.light.text,
          dark: tokens.color.dark.text,
        },
        'text-muted': {
          light: tokens.color.light.textMuted,
          dark: tokens.color.dark.textMuted,
        },
        'text-faint': {
          light: tokens.color.light.textFaint,
          dark: tokens.color.dark.textFaint,
        },
        'hover-bg': {
          light: tokens.color.light.hoverBg,
          dark: tokens.color.dark.hoverBg,
        },
        'input-bg': {
          light: tokens.color.light.inputBg,
          dark: tokens.color.dark.inputBg,
        },
        'login-panel-bg': {
          light: tokens.color.light.loginPanelBg,
          dark: tokens.color.dark.loginPanelBg,
        },
        primary: tokens.color.light.primary,
        'primary-soft': tokens.color.light.primarySoft,
        secondary: tokens.color.light.secondary,
        'secondary-soft': tokens.color.light.secondarySoft,
        accent: tokens.color.light.accent,
        'accent-soft': tokens.color.light.accentSoft,
        warning: tokens.color.light.warning,
        'warning-soft': tokens.color.light.warningSoft,
        danger: tokens.color.light.danger,
        'danger-soft': tokens.color.light.dangerSoft,
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.sans,
      },
      fontSize: {
        xs: tokens.typography.fontSize.xs,
        sm: tokens.typography.fontSize.sm,
        base: tokens.typography.fontSize.base,
        lg: tokens.typography.fontSize.lg,
        xl: tokens.typography.fontSize.xl,
        '2xl': tokens.typography.fontSize['2xl'],
        '3xl': tokens.typography.fontSize['3xl'],
        '4xl': tokens.typography.fontSize['4xl'],
        '5xl': tokens.typography.fontSize['5xl'],
      },
      spacing: {
        1: tokens.spacing['1'],
        2: tokens.spacing['2'],
        3: tokens.spacing['3'],
        4: tokens.spacing['4'],
        6: tokens.spacing['6'],
        8: tokens.spacing['8'],
        10: tokens.spacing['10'],
        12: tokens.spacing['12'],
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        xl: tokens.radius.xl,
        '2xl': tokens.radius['2xl'],
      },
      boxShadow: {
        'card-light': tokens.shadow.light.md,
        'card-dark': tokens.shadow.dark.md,
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
