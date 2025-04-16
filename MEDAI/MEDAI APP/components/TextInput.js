// src/components/TextInput.js
import React from 'react';
import { TextInput as RNTextInput, View, StyleSheet } from 'react-native';

const TextInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  placeholderTextColor = '#999',
  style,
  ...props 
}) => {
  return (
    <RNTextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});

export default TextInput;