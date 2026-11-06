import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  copy: {
    padding: 0,
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
    backgroundColor: '#E7EEEA',
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
