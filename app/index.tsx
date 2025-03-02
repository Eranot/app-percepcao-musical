import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppProvider } from '@/constants/AppContext';
import { SettingsScreen } from '@/components/SettingsScreen';
import { TrainingScreen } from '@/components/TrainingScreen';

export default function HomeScreen() {
  const [isTraining, setIsTraining] = useState(false);

  const startTraining = () => {
    setIsTraining(true);
  };

  const finishTraining = () => {
    setIsTraining(false);
  };

  return (
    <AppProvider>
      <View style={styles.container}>
        {isTraining ? (
          <TrainingScreen onFinish={finishTraining} />
        ) : (
          <SettingsScreen onStartTraining={startTraining} />
        )}
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
}); 