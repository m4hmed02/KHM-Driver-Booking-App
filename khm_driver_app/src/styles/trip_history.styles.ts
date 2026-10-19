import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.secondaryText,
    lineHeight: 20,
  },
  earningsContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  earningsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.secondaryText,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
});
