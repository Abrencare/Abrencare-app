import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7EEEA',
    overflow: 'hidden',
    minHeight: 236,
    position: 'relative',
  },
  backgroundPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
  },
  copy: {
    padding: 22,
    paddingRight: 110,
    zIndex: 1,
  },
  greeting: {
    color: '#1A4A42',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#16332C',
    lineHeight: 34,
  },
  subtitle: {
    color: '#5C6B65',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
    maxWidth: 240,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231,238,234,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 6,
  },
  badgeText: {
    color: '#16332C',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default styles;
