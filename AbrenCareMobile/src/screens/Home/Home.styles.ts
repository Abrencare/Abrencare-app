import { StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 100,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greeting: {
    color: colors.subtitle,
    fontSize: 14,
    marginBottom: 2,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scoreCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  scoreHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scoreTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  scoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  scoreStatus: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  scoreSubtext: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    marginBottom: 16,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  quickActionItem: {
    alignItems: 'center',
    marginBottom: 8,
    minWidth: '22%',
  },
  quickActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    marginBottom: 6,
    width: 40,
  },
  quickActionLabel: {
    color: colors.white,
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    marginTop: Spacing.lg,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.subtitle,
    fontSize: 13,
    lineHeight: 20,
  },
  cardMeta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    padding: 12,
    width: '48%',
  },
  metricIconWrapper: {
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    marginBottom: 10,
    width: 36,
  },
  metricLabel: {
    color: colors.subtitle,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  consultationRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  consultationAvatar: {
    alignItems: 'center',
    backgroundColor: '#F8EEDC',
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    marginRight: 12,
    width: 46,
  },
  consultationTextWrap: {
    flex: 1,
  },
  consultationDoctor: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  consultationDetails: {
    color: colors.subtitle,
    fontSize: 12,
    marginTop: 2,
  },
  tipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  tipText: {
    color: colors.text,
    fontSize: 13,
    marginLeft: 8,
  },
  bottomNav: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navItemActive: {
    borderRadius: 12,
  },
  navLabel: {
    color: colors.subtitle,
    fontSize: 11,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default styles;
