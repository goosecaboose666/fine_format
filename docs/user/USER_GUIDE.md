# User Guide

## Overview

Fine Format is a sophisticated toolkit for generating high-quality fine-tuning datasets through advanced content analysis and enhancement methodologies. This guide will walk you through the process of creating datasets for your AI models.

## Process Workflow

The application follows a streamlined workflow to transform your raw content into structured training data:

1.  **Content Ingestion**: Upload documents or provide URLs.
2.  **Theme Identification**: The system analyzes the content to identify key themes relevant to your fine-tuning goals.
3.  **Q&A Generation**: High-quality question-answer pairs are generated from the source content.
4.  **Synthetic Augmentation**: Additional synthetic pairs are created to ensure diversity and coverage.
5.  **Validation**: All pairs undergo a rigorous validation process to ensure accuracy and quality.
6.  **Dataset Compilation**: The final dataset is compiled and made available for download.

## Getting Started

1.  **Select Your Goal**: Choose the primary objective for your fine-tuning dataset (e.g., "Topic Focus", "Knowledge Expansion", "Style Adaptation").
2.  **Upload Content**:
    *   **Files**: Click "Upload Files" to select documents (PDF, DOCX, TXT, MD, etc.) from your computer.
    *   **URLs**: Click "Add URL" to input web addresses for the system to scrape and analyze.

## Generating the Dataset

Once your content is uploaded and your goal is selected:

1.  Click the **"Generate Dataset"** button.
2.  The system will proceed through several steps:
    *   *Processing content and identifying themes*
    *   *Generating Q&A pairs from content*
    *   *Generating synthetic Q&A pairs*
    *   *Validating Q&A pairs*
    *   *Generating incorrect answers (distractors)*
    *   *Compiling final dataset*
3.  You can monitor the progress via the progress bar and status updates.

## Review and Export

After generation is complete:

1.  **Review Statistics**: See the number of source files, themes identified, and total Q&A pairs generated.
2.  **Download**: Click the **"Download Dataset"** button to save the dataset to your local machine. The default format is JSONL, suitable for most fine-tuning pipelines.

## Tips for Best Results

*   **Diverse Sources**: Use a mix of files and URLs to provide a broad knowledge base.
*   **Clear Goals**: Select the fine-tuning goal that best matches your intended use case.
*   **Quality Content**: Ensure the source documents are high-quality and relevant to the domain.
