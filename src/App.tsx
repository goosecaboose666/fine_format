import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { UrlInput } from './components/UrlInput';
import { ProcessingStatus } from './components/ProcessingStatus';
import { DatasetPreview } from './components/DatasetPreview';
import { useDatasetGeneration } from './hooks/useDatasetGeneration';
import { Card, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Download, Settings, Database, RefreshCw } from 'lucide-react';
import { FINE_TUNING_GOALS } from './constants';
import type { FileData, UrlData, FineTuningGoal } from './types';

export default function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [urls, setUrls] = useState<UrlData[]>([]);
  const [fineTuningGoal, setFineTuningGoal] = useState<FineTuningGoal>('topic');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gapFilling, setGapFilling] = useState(false);
  const [appendSources, setAppendSources] = useState(false);

  const {
    isProcessing,
    processedData,
    currentStep,
    progress,
    error,
    generateDataset,
    downloadDataset,
    resetGeneration
  } = useDatasetGeneration();

  const handleGenerate = () => {
    generateDataset(files, urls, fineTuningGoal, gapFilling, appendSources);
  };

  const handleReset = () => {
    setFiles([]);
    setUrls([]);
    resetGeneration();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10"></div>
            <div className="flex items-center justify-center mb-4">
              <Database className="w-10 h-10 text-accent mr-3 animate-pulse" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }} />
              <h1 className="text-4xl font-bold text-primary font-mono tracking-tighter" style={{ textShadow: '0 0 10px rgba(0, 255, 65, 0.5)' }}>
                Fine Format
              </h1>
            </div>
            <p className="text-muted max-w-2xl mx-auto font-mono text-lg">
              Upload your knowledgebase. Download your dataset.
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Input Section */}
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FileUpload files={files} onFilesChange={setFiles} disabled={isProcessing} />
                  <UrlInput urls={urls} onUrlsChange={setUrls} disabled={isProcessing} />
                </div>

                {/* Settings */}
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-primary font-mono tracking-wide flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-accent" />
                      GENERATION SETTINGS
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-accent hover:text-primary"
                    >
                      {showAdvanced ? 'HIDE' : 'SHOW'} ADVANCED
                    </Button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 font-mono tracking-wide">
                          FINE-TUNING GOAL
                        </label>
                        <select
                          value={fineTuningGoal}
                          onChange={(e) => setFineTuningGoal(e.target.value as FineTuningGoal)}
                          disabled={isProcessing}
                          className="w-full px-4 py-3 cyber-input text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                          style={{
                            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(26, 26, 26, 0.6))',
                          }}
                        >
                          {FINE_TUNING_GOALS.map((goal) => (
                            <option key={goal.id} value={goal.id}>
                              {goal.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted mt-2 font-mono">
                          Select the target behavior for your fine-tuned model
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="gapFilling"
                          checked={gapFilling}
                          onChange={(e) => setGapFilling(e.target.checked)}
                          disabled={isProcessing}
                          className="w-5 h-5 border-border bg-card rounded focus:ring-primary text-primary"
                        />
                        <label htmlFor="gapFilling" className="text-sm font-medium text-foreground cursor-pointer select-none">
                          Identify & Fill Knowledge Gaps
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="appendSources"
                          checked={appendSources}
                          onChange={(e) => setAppendSources(e.target.checked)}
                          disabled={isProcessing}
                          className="w-5 h-5 border-border bg-card rounded focus:ring-primary text-primary"
                        />
                        <label htmlFor="appendSources" className="text-sm font-medium text-foreground cursor-pointer select-none">
                          Append Additional Sources
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isProcessing || (files.length === 0 && urls.length === 0)}
                    variant="primary"
                    className="flex-1 min-w-[200px] h-12 text-lg font-bold tracking-wider"
                  >
                    <Database className="w-5 h-5 mr-2" />
                    {isProcessing ? 'GENERATING...' : 'GENERATE DATASET'}
                  </Button>

                  {processedData && (
                    <Button
                      onClick={downloadDataset}
                      variant="outline"
                      className="flex-1 min-w-[200px] h-12 text-lg font-bold tracking-wider border-accent text-accent hover:bg-accent/10"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      DOWNLOAD DATASET
                    </Button>
                  )}

                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    disabled={isProcessing}
                    className="h-12 px-6 text-error hover:text-red-400 hover:bg-error/10"
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                    RESET
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Processing Status */}
            {(isProcessing || progress > 0 || error) && (
              <ProcessingStatus
                currentStep={currentStep}
                progress={progress}
                isProcessing={isProcessing}
                error={error || undefined}
              />
            )}

            {/* Dataset Preview */}
            {processedData && !isProcessing && (
              <DatasetPreview data={processedData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
