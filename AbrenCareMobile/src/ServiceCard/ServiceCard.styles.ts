import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tag: {
    color: '#5D6D7E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#1A2A3A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: '#5D6D7E',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  featureItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featureText: {
    color: '#2C3E50',
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(44, 62, 80, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '600',
  },
});
