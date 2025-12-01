import { useState, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { openRouterService } from '../services/openRouterService';
import { downloadService } from '../services/downloadService';
import type { FileData, UrlData, ProcessedData, FineTuningGoal } from '../types';

export function useDatasetGeneration() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateDataset = useCallback(async (
    files: FileData[],
    urls: UrlData[],
    fineTuningGoal: FineTuningGoal
  ) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setCurrentStep('Initializing...');

    try {
      // Step 1: Process content and identify themes
      setCurrentStep('Processing content and identifying themes...');
      setProgress(10);

      const allContent = [
        ...files.map(f => ({ type: 'file' as const, name: f.file.name, content: f.cleanedText || f.rawContent })),
        ...urls.map(u => ({ type: 'url' as const, url: u.url, content: u.rawContent }))
      ];

      const themes = await geminiService.identifyThemes(allContent, fineTuningGoal);
      setProgress(25);

      // Step 2: Perform web research for knowledge gaps
      setCurrentStep('Performing web research for knowledge gaps...');
      // Future feature: Implement web research
      setProgress(40);

      // Step 3: Generate Q&A pairs from original content
      setCurrentStep('Generating Q&A pairs from content...');
      let qaPairs: any[] = [];
      try {
        qaPairs = await geminiService.generateQAPairs(allContent, themes, fineTuningGoal);
      } catch (qaError) {
        console.error('Error generating Q&A pairs:', qaError);
        throw new Error(`Failed to generate Q&A pairs: ${qaError instanceof Error ? qaError.message : 'Unknown error'}`);
      }
      setProgress(60);

      // Step 4: Generate synthetic Q&A pairs
      setCurrentStep('Generating synthetic Q&A pairs...');
      const syntheticPairs = await geminiService.generateQAPairs(
        [],
        themes,
        fineTuningGoal
      );

      const allPairs = [...qaPairs, ...syntheticPairs];
      setProgress(75);

      // Step 5: Validate all Q&A pairs
      setCurrentStep('Validating Q&A pairs...');
      const validationResults = await openRouterService.validateQAPairs(allPairs);

      // Update pairs with validation info
      allPairs.forEach((pair, index) => {
          if (validationResults[index]) {
             pair.validationStatus = validationResults[index].isValid ? 'validated' : 'rejected';
             pair.validationConfidence = validationResults[index].confidence;
          }
      });
      setProgress(85);

      // Step 6: Generate incorrect answers for training
      setCurrentStep('Generating incorrect answers...');
      const incorrectPairs = await geminiService.generateIncorrectAnswers(allPairs);
      setProgress(95);

      // Step 7: Compile final dataset
      setCurrentStep('Compiling final dataset...');
      const finalAllPairs = [...allPairs, ...incorrectPairs];

      const finalData: ProcessedData = {
        qaPairs: finalAllPairs.map(pair => ({
          user: pair.question,
          model: pair.answer,
          isCorrect: pair.isCorrect ?? true,
          source: pair.source || 'original',
          validationStatus: pair.validationStatus,
          validationConfidence: pair.validationConfidence
        })),
        combinedCleanedText: allContent.map(c => c.content).join('\n\n'),
        sourceFileCount: files.length,
        sourceUrlCount: urls.length,
        identifiedThemes: themes,
        correctAnswerCount: allPairs.length,
        incorrectAnswerCount: incorrectPairs.length,
      };

      setProcessedData(finalData);
      setProgress(100);
      setCurrentStep('Dataset generation complete!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Dataset generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const downloadDataset = useCallback(() => {
    if (processedData) {
      downloadService.downloadDataset(processedData);
    }
  }, [processedData]);

  const resetGeneration = useCallback(() => {
    setProcessedData(null);
    setCurrentStep('');
    setProgress(0);
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    isProcessing,
    processedData,
    currentStep,
    progress,
    error,
    generateDataset,
    downloadDataset,
    resetGeneration
  };
}
