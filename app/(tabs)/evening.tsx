/**
 * One Day OS - Evening Layer
 * Quest Completion & Reflection Interface
 */

import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { theme } from '../../src/ui/theme/theme';

export default function EveningScreen() {
  const [quest1Completed, setQuest1Completed] = useState(false);
  const [quest2Completed, setQuest2Completed] = useState(false);
  const [stagnationReason, setStagnationReason] = useState('');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>EVENING LAYER</Text>
        <Text style={styles.subheaderText}>Quest Completion & Reflection</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Quest Completion Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY QUESTS</Text>

          {/* Quest 1 */}
          <Pressable
            style={styles.questItem}
            onPress={() => setQuest1Completed(!quest1Completed)}
          >
            <View style={styles.checkbox}>
              {quest1Completed && <Text style={styles.checkmark}>X</Text>}
            </View>
            <Text style={styles.questText}>
              Quest 1: [Placeholder Quest]
            </Text>
          </Pressable>

          {/* Quest 2 */}
          <Pressable
            style={styles.questItem}
            onPress={() => setQuest2Completed(!quest2Completed)}
          >
            <View style={styles.checkbox}>
              {quest2Completed && <Text style={styles.checkmark}>X</Text>}
            </View>
            <Text style={styles.questText}>
              Quest 2: [Placeholder Quest]
            </Text>
          </Pressable>
        </View>

        {/* Stagnation Reason Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>停滞の理由</Text>
          <Text style={styles.sectionSubtitle}>
            If quests were not completed, why?
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            value={stagnationReason}
            onChangeText={setStagnationReason}
            placeholder="Enter reason for incomplete quests..."
            placeholderTextColor="#666666"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
          ]}
          onPress={() => {
            // TODO: Implement submit logic
            console.log('Submit pressed', { quest1Completed, quest2Completed, stagnationReason });
          }}
        >
          <Text style={styles.submitButtonText}>COMPLETE DAY</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.foreground,
  },
  headerText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  subheaderText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
  },
  questText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
    flex: 1,
  },
  textInput: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    padding: theme.spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: theme.colors.foreground,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    marginTop: theme.spacing.md,
  },
  submitButtonPressed: {
    backgroundColor: theme.colors.accent,
  },
  submitButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.background,
    textAlign: 'center',
  },
});
