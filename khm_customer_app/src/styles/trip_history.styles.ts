import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Slightly gray background like the screenshot
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.secondaryText,
    lineHeight: 22,
  },
  earningsContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  earningsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.secondaryText,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  earningsValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 32, // Approximate safe area for bottom
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  }
});
