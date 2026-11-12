import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Generator } from '../../domain/entities/Generator';

interface Props {
  moto: Generator;
}

export const MotoCard: React.FC<Props> = ({ moto }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{moto.brand} {moto.model}</Text>
      <Text style={styles.subtitle}>Capacidad: {moto.capacityKva} kVA | Horómetro: {moto.currentHours.toFixed(1)} hrs</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});
