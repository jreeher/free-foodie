import { StyleSheet } from 'react-native';

/**
 * Shared layout and component styles reused across screens.
 * Import specific style objects rather than the whole module.
 */

export const sharedLayout = StyleSheet.create({
  screenContainer: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
});

export const sharedCard = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardSeparator: {
    height: StyleSheet.hairlineWidth,
  },
});

export const sharedTypography = StyleSheet.create({
  screenTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  captionText: {
    fontSize: 13,
  },
  labelCaps: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
});

export const sharedButton = StyleSheet.create({
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export const sharedEmptyState = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.75,
  },
});
