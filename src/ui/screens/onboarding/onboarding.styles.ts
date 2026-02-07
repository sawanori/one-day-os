/**
 * One Day OS - OnboardingFlow Styles
 *
 * Brutalist design system styles for the onboarding flow.
 * Extracted from OnboardingFlow.tsx for maintainability.
 */

import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  stepContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.title,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  heading: {
    fontSize: theme.typography.fontSize.heading,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  description: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    lineHeight: theme.typography.fontSize.body * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xl,
  },
  prompt: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  identityContainer: {
    marginBottom: theme.spacing.lg,
  },
  identityPrefix: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  textInputMulti: {
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textInputSpacing: {
    marginTop: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    alignItems: 'center',
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  explanationBox: {
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  explanationTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  explanationText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    lineHeight: theme.typography.fontSize.caption * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.md,
  },
  exampleTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  exampleText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.accent,
    lineHeight: theme.typography.fontSize.caption * theme.typography.lineHeight.relaxed,
  },
});
