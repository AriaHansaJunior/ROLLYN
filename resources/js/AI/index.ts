/**
 * AI & Computer Vision Subsystems Index
 * 
 * Provides centralized exports for all AI capabilities in IDX AI WISE:
 * 1. Vision / OCR - Client-side image processing, Tesseract.js, segment matching
 * 2. Spectrum - Python ML microservice client and hybrid weight detection engine
 * 3. Recommendation - Warehouse slot recommendation heuristics and evaluation
 */

// Vision & OCR Modules
export * from './Vision/ImageProcessor';
export * from './Vision/OCRService';
export * from './Vision/SegmentMatcher';
export * from './Vision/DigitTemplateStore';
export * from './Vision/TemplateClassifier';

// Spectrum Engine & Weight Detection
export * from './Spectrum/SpectrumService';
export { default as SpectrumWeightDetectionEngine } from './Spectrum/SpectrumWeightDetectionEngine';

// Warehouse Location Recommendation Engine
export * from './Recommendation/SpectrumRecommendationEngine';

