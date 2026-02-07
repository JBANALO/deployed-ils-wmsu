import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Terms and Conditions</Text>
        <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.text}>
          By accessing and using this WMSU QR Attendance System, you accept and agree to be bound by the terms and provision of this agreement.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.text}>
          This application is exclusively for Western Mindanao State University (WMSU) teachers. Registration requires a valid @wmsu.edu.ph email address.
        </Text>

        <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
        <Text style={styles.text}>
          Users are responsible for maintaining the confidentiality of their account credentials. Any activities that occur under your account are your responsibility.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Collection and Privacy</Text>
        <Text style={styles.text}>
          We collect and store attendance records, user information, and QR code scan data. All data is used solely for attendance tracking purposes and is handled in accordance with data protection regulations.
        </Text>

        <Text style={styles.sectionTitle}>5. Acceptable Use</Text>
        <Text style={styles.text}>
          Users must not attempt to manipulate attendance records, share QR codes inappropriately, or misuse the system in any way that compromises its integrity.
        </Text>

        <Text style={styles.sectionTitle}>6. Service Availability</Text>
        <Text style={styles.text}>
          While we strive to maintain continuous service availability, we do not guarantee uninterrupted access to the application.
        </Text>

        <Text style={styles.sectionTitle}>7. Modifications</Text>
        <Text style={styles.text}>
          WMSU reserves the right to modify these terms at any time. Continued use of the application after changes constitutes acceptance of the modified terms.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact Information</Text>
        <Text style={styles.text}>
          For questions or concerns about these terms, please contact WMSU IT Department.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    textAlign: 'justify',
  },
});