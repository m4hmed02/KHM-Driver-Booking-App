import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: Colors.light.secondaryText,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusPillCompleted: {
    backgroundColor: Colors.light.success,
  },
  statusPillCanceled: {
    backgroundColor: '#F3F4F6', // Light gray for canceled
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: Colors.light.primary,
  },
  statusTextCanceled: {
    color: Colors.light.secondaryText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 16,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 12,
  },
  dotTop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: Colors.light.background,
  },
  dotTopCompleted: {
    borderColor: Colors.light.primary,
  },
  dotTopCanceled: {
    borderColor: '#D1D5DB', // Grayed out
  },
  timelineLine: {
    width: 2,
    height: 36,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  dotBottom: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotBottomCompleted: {
    backgroundColor: Colors.light.red,
  },
  dotBottomCanceled: {
    backgroundColor: '#D1D5DB', // Grayed out
  },
  addressesContainer: {
    flex: 1,
  },
  addressRow: {
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.secondaryText,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  addressTextCanceled: {
    color: Colors.light.secondaryText,
  },
  chevronContainer: {
    paddingLeft: 8,
  },
});
