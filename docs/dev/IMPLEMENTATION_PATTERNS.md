# Fine Format Implementation Patterns & Best Practices

This document captures reusable patterns, architectural decisions, and implementation best practices identified from the Fine Format hackathon codebase.

---

## I. Service Layer Architecture Pattern

### Overview
The service layer pattern used in Fine Format demonstrates excellent separation of concerns. Each service encapsulates specific business logic without dependencies on UI concerns.

### Implementation

**File: `src/services/fileService.ts`**
```typescript
export class FileService {
  public static async processFiles(files: FileList): Promise<FileData[]> {
    const filePromises = Array.from(files).map((file, index) => 
      this.processFile(file, index)
    );
    return Promise.all(filePromises);
  }

  private static async processFile(file: File, index: number): Promise<FileData> {
    // Single responsibility: process one file
    // Returns consistent data structure regardless of outcome
  }
}

// Usage in components/hooks - clean and simple
const fileData = await FileService.processFiles(files);
```

### Key Principles Applied
1. **Single Responsibility**: Each method does one thing
2. **Static Methods**: Stateless, reusable utilities
3. **Consistent Return Types**: Always returns data structure with status
4. **Error Handling**: Returns error in data structure, not throwing
5. **No Side Effects**: Pure functions that don't modify external state

### Why This Pattern Works Well
- **Testability**: Easy to unit test without mocking React components
- **Reusability**: Services can be used in different contexts (components, hooks, workers)
- **Maintainability**: Changes to business logic don't affect UI components
- **Composability**: Services can call other services

### Recommended for MVP
✅ **Adopt this pattern for:**
- LLM API integration
- Data transformation
- Validation logic
- Export/download handling
- Content cleaning and formatting

---

## II. Hook-Based State Orchestration Pattern

### Overview
The `useDatasetGeneration` hook demonstrates how to manage complex async workflows in React while keeping state synchronized.

### Pattern Structure

```typescript
export function useDatasetGeneration() {
  // State management - clear, atomic pieces
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Primary orchestrator function - coordinates workflow
  const generateDataset = useCallback(async (files, urls, goal) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Multi-step workflow with progress updates
      setCurrentStep('Step 1...');
      setProgress(10);
      // ... work ...
      
      setCurrentStep('Step 2...');
      setProgress(50);
      // ... more work ...
    } catch (err) {
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Secondary actions - data manipulation
  const downloadDataset = useCallback(() => {
    if (processedData) {
      downloadService.downloadDataset(processedData);
    }
  }, [processedData]);

  // Reset function - cleanup
  const resetGeneration = useCallback(() => {
    setProcessedData(null);
    setCurrentStep('');
    setProgress(0);
    setError(null);
    setIsProcessing(false);
  }, []);

  // Return clean interface
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
```

### Key Principles
1. **Atomic State**: Each piece of state has single purpose
2. **Workflow Coordination**: Primary function orchestrates steps
3. **Progress Tracking**: UI can show real-time progress
4. **Error Handling**: Errors caught and stored in state
5. **Cleanup**: Reset function to clear all state

### Why This Pattern Works
- **Predictable**: State flow is easy to follow
- **Debuggable**: Each state update logged in React DevTools
- **Testable**: Can mock async operations
- **Scalable**: Easy to add more steps or state pieces

### Common Mistakes to Avoid
❌ **DON'T**: Put everything in one state object
```typescript
// BAD - hard to update individual fields
const [state, setState] = useState({ processing: false, data: null, step: '', progress: 0, error: null });
```

❌ **DON'T**: Multiple setState calls without batching
```typescript
// BAD - causes multiple renders
setIsProcessing(true);
setCurrentStep('...');
setProgress(10);
```

✅ **DO**: Use atomic state pieces
```typescript
// GOOD - React auto-batches in event handlers
setIsProcessing(true);
setCurrentStep('Step 1');
setProgress(10);
```

### Recommended for MVP
✅ **Apply this pattern to:**
- Main dataset generation workflow
- Multi-step processing
- Any async operation with progress
- User interaction workflows

---

## III. Component Composition Pattern

### Overview
Fine Format uses functional component composition with clear prop contracts. Components are composable and have single responsibilities.

### File Organization Pattern

```
components/
├── FileUpload.tsx          # Focused on file input
├── UrlInput.tsx            # Focused on URL input
├── ProcessingStatus.tsx    # Focused on progress display
├── DatasetPreview.tsx      # Focused on results display
└── ui/                     # Reusable primitives
    ├── Card.tsx            # Layout container
    ├── Button.tsx          # Interactive element
    ├── Alert.tsx           # Messaging
    └── Badge.tsx           # Status indicator
```

### Component Design Pattern

```typescript
interface FileUploadProps {
  files: FileData[];
  onFilesChange: (files: FileData[]) => void;
}

export function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    // Validation and processing
    const processedFiles = await FileService.processFiles(droppedFiles);
    onFilesChange(processedFiles);
  };

  return (
    // UI for file upload
  );
}

// Usage in parent
<FileUpload files={files} onFilesChange={setFiles} />
```

### Key Design Principles
1. **Props-Driven**: All inputs via props
2. **Callbacks**: State changes via callbacks
3. **Single Responsibility**: Each component does one thing
4. **Composable**: Can combine components flexibly
5. **Type-Safe**: Props interfaces document contracts

### Why This Pattern Works
- **Reusable**: Same component works in multiple contexts
- **Testable**: Easy to test with different props
- **Maintainable**: Changes don't cascade
- **Performant**: Clear dependency tracking for re-renders

### Common Patterns Used in Fine Format

#### 1. Container + Presentational Split
```typescript
// Component handles props and state management
function FileUpload({ files, onFilesChange }) {
  return <FileUploadUI files={files} onDrop={handleDrop} />;
}

// Separate component for rendering
function FileUploadUI({ files, onDrop }) {
  return (
    <div onDrop={onDrop}>
      {files.map(file => <FileItem key={file.id} file={file} />)}
    </div>
  );
}
```

#### 2. Props Forwarding
```typescript
// Flex component forwards props to underlying elements
interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: number;
  direction?: 'row' | 'column';
}

export function Flex({ gap = 4, direction = 'row', ...props }: FlexProps) {
  return (
    <div 
      className={`flex gap-${gap} flex-${direction}`}
      {...props}
    />
  );
}
```

#### 3. Render Props Pattern (Alternative)
```typescript
// Though not used in Fine Format, good for reusable logic
function DataProcessor({ onData, children }) {
  const [data, setData] = useState(null);
  const processData = async () => {
    const result = await service.process();
    setData(result);
  };
  return children({ data, processData });
}

// Usage
<DataProcessor onData={handler}>
  {({ data, processData }) => (
    <div>
      {data && <div>{data}</div>}
      <button onClick={processData}>Process</button>
    </div>
  )}
</DataProcessor>
```

### Recommended for MVP
✅ **Keep current structure** - it's good
✅ **Add more UI primitives** for consistency
✅ **Consider Render Props** for complex data flows
✅ **Use compound components** for related components

---

## IV. Type Safety Pattern

### Overview
Fine Format uses TypeScript effectively to catch errors at compile time and document code through types.

### Type Definition Pattern

```typescript
// Domain model types
export interface QAPair {
  user: string;
  model: string;
}

// Data structure types
export interface FileData {
  id: string;                           // For React keys
  file: File;                           // Browser File object
  mimeType: string;                     // Content type
  rawContent: string;                   // Text or base64
  isBinary: boolean;                    // Discriminant
  cleanedText?: string | null;          // Optional, nullable
  error?: string | null;                // Optional, nullable
  status: 'pending' | 'reading' | 'read' | 'cleaning' | 'cleaned' | 'failed';  // Literal union
}

// Union types for flexible handling
export type TextMimeType = 'text/plain' | 'text/markdown' | 'text/html' | string;
export type BinaryMimeType = 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | string;
```

### Key Type Patterns Used

#### 1. Status Discriminated Unions
```typescript
type FileData = 
  | { status: 'pending'; content?: undefined }
  | { status: 'read'; content: string }
  | { status: 'error'; error: string; content?: undefined };

// TypeScript knows which fields are available based on status
if (data.status === 'read') {
  console.log(data.content); // OK - type-safe
  console.log(data.error);   // TS Error - can't access error
}
```

#### 2. Branded Types for Extra Safety
```typescript
// Prevent accidentally mixing similar types
type FileId = string & { readonly __brand: 'FileId' };
type UserId = string & { readonly __brand: 'UserId' };

const fileId: FileId = 'file-123' as FileId;
const userId: UserId = 'user-456' as UserId;

// TS Error - can't mix these even though both strings
function deleteFile(id: FileId) { /* ... */ }
deleteFile(userId); // Type error!
```

#### 3. Utility Types for DRY Code
```typescript
// Extract subset of interface
type FileUploadProps = Pick<FileData, 'id' | 'file' | 'status'>;

// Make all fields optional
type PartialFileData = Partial<FileData>;

// Make all fields readonly
type ReadonlyFileData = Readonly<FileData>;

// Extract return type of function
type FileProcessResult = Awaited<ReturnType<typeof FileService.processFiles>>;
```

### Why Type Safety Matters
- **Compile-Time Errors**: Catch bugs before runtime
- **Documentation**: Types document expected data shapes
- **IDE Support**: Better autocomplete and refactoring
- **Confidence**: Refactoring with confidence
- **Performance**: No runtime type checking overhead

### Anti-Patterns to Avoid

❌ **DON'T**: Use `any` type
```typescript
// BAD
function processData(data: any): any {
  return data.something;
}
```

✅ **DO**: Use specific types or generics
```typescript
// GOOD
function processData<T extends { something: string }>(data: T): T['something'] {
  return data.something;
}
```

### Recommended for MVP
✅ **Maintain strong typing** throughout
✅ **Define all interfaces** upfront
✅ **Use discriminated unions** for complex state
✅ **Avoid any** - use unknown or generics
✅ **Document types** with JSDoc comments

---

## V. Error Handling Pattern

### Current Pattern (Problematic)

The current error handling wraps errors in data structures, which is good, but the error messages are sometimes too generic.

```typescript
// Current approach - catches but masks details
try {
  const content = await this.fetchUrlContent(url);
} catch (error) {
  return {
    ...baseUrlData,
    status: 'failed',
    error: `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
  };
}
```

### Improved Error Handling Pattern

```typescript
// Better: Structured error information
interface ErrorInfo {
  code: string;                    // Machine-readable error code
  message: string;                 // User-friendly message
  details?: string;                // Technical details
  shouldRetry: boolean;            // Can user retry?
  suggestedAction?: string;        // What to do next?
}

class FileProcessingError extends Error {
  constructor(
    public code: string,
    message: string,
    public shouldRetry: boolean = false,
    public details?: string
  ) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

// Usage
try {
  const content = await readAsText(file);
} catch (error) {
  if (error.name === 'NotReadableError') {
    throw new FileProcessingError(
      'FILE_READ_ERROR',
      'Unable to read file. File may be corrupted or in use by another program.',
      true,  // Should retry
      error.message
    );
  }
  throw new FileProcessingError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred while reading the file.',
    false  // Don't retry
  );
}

// Handling in components
try {
  const files = await FileService.processFiles(uploadedFiles);
} catch (error: FileProcessingError) {
  if (error.shouldRetry) {
    showRetryButton();
  }
  showErrorToUser(error.message);
  logForDebugging(error.code, error.details);
}
```

### Error Handling Best Practices

1. **Categorize Errors**
   - Input validation errors (user's fault)
   - Transient errors (can retry)
   - Permanent errors (won't retry)
   - System errors (need ops attention)

2. **User-Friendly Messages**
   - Explain what went wrong
   - Suggest recovery action
   - Avoid technical jargon

3. **Logging for Debugging**
   - Capture full error context
   - Don't expose sensitive data in user messages
   - Use structured logging

4. **Retry Logic**
   ```typescript
   async function retryWithBackoff<T>(
     operation: () => Promise<T>,
     maxRetries: number = 3,
     backoffMs: number = 1000
   ): Promise<T> {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await operation();
       } catch (error) {
         if (attempt === maxRetries) throw error;
         await delay(backoffMs * Math.pow(2, attempt - 1));
       }
     }
   }
   ```

### Recommended for MVP
✅ **Implement structured errors**
✅ **Categorize by error type**
✅ **Provide user-friendly messages**
✅ **Add retry logic** for transient failures
✅ **Log errors with context** for debugging

---

## VI. Data Validation Pattern

### Overview
Fine Format validates data at multiple boundaries to catch issues early.

### Input Validation Layers

```typescript
// Layer 1: Type validation
function validateFileData(data: unknown): FileData {
  if (!isFileData(data)) {
    throw new Error('Invalid file data structure');
  }
  return data;
}

// Layer 2: Business logic validation
class FileService {
  private static async processFile(file: File): Promise<FileData> {
    // Size validation
    if (file.size > MAX_SIZE) {
      return { status: 'failed', error: 'File too large' };
    }

    // Type validation
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return { status: 'failed', error: 'Unsupported file type' };
    }

    // Content validation
    const content = await readFile(file);
    if (!content || content.trim().length < MIN_LENGTH) {
      return { status: 'failed', error: 'File content too short' };
    }

    return { status: 'read', content };
  }
}

// Layer 3: API response validation
function validateApiResponse(response: unknown): ProcessedData {
  const schema = z.object({
    themes: z.array(z.string()),
    pairs: z.array(z.object({
      question: z.string(),
      answer: z.string()
    }))
  });
  
  return schema.parse(response);
}
```

### Validation Checklist for MVP

- [ ] File size limits enforced
- [ ] File type whitelist validated
- [ ] Required fields present
- [ ] String length constraints
- [ ] Number range constraints
- [ ] Array item counts
- [ ] URL format validation
- [ ] Email format validation
- [ ] No SQL injection vectors
- [ ] No XSS vectors in user content

### Recommended for MVP
✅ **Validate at input boundaries**
✅ **Check file size before processing**
✅ **Validate file types**
✅ **Validate required fields**
✅ **Return clear validation errors**

---

## VII. Performance Optimization Patterns

### Identified Optimization Opportunities

1. **Memoization for Expensive Computations**
```typescript
// Cache theme analysis results
const themeCache = new Map<string, string[]>();

async function identifyThemes(content: string): Promise<string[]> {
  const contentHash = hashContent(content);
  
  if (themeCache.has(contentHash)) {
    return themeCache.get(contentHash)!;
  }

  const themes = await expensiveAnalysis(content);
  themeCache.set(contentHash, themes);
  return themes;
}
```

2. **Parallel Processing for Independent Tasks**
```typescript
// Process multiple files in parallel
const filePromises = Array.from(files).map(file => 
  FileService.processFile(file)
);
const results = await Promise.all(filePromises);

// Limit concurrency to avoid overwhelming system
const results = await pLimit(3)(
  filePromises.map(p => () => p)
);
```

3. **Lazy Loading for Large Datasets**
```typescript
// DatasetPreview component uses pagination
function DatasetPreview({ pairs }: Props) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const displayedPairs = pairs.slice(start, end);

  return (
    <>
      {displayedPairs.map(pair => <PairRow pair={pair} />)}
      <Pagination 
        page={page}
        totalPages={Math.ceil(pairs.length / itemsPerPage)}
        onPageChange={setPage}
      />
    </>
  );
}
```

4. **Compression for Large Payloads**
```typescript
// Compress large content before sending
async function compressContent(content: string): Promise<string> {
  const compressed = await compress(content);
  return btoa(compressed); // Base64 encode for transport
}

async function decompressContent(compressed: string): Promise<string> {
  const decoded = atob(compressed); // Base64 decode
  return decompress(decoded);
}
```

### Recommended for MVP
✅ **Use pagination** for large datasets
✅ **Implement memoization** for expensive ops
✅ **Use Promise.all** for parallel work
✅ **Lazy load** when possible
✅ **Profile before optimizing**

---

## VIII. Configuration Management Pattern

### Current Pattern (Good Start)
```typescript
// constants.ts
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
export const SUPPORTED_TEXT_MIME_TYPES = ['text/plain', 'text/markdown', 'text/html'];
export const FILE_SIZE_LIMIT = 5 * 1024 * 1024;
export const QA_PAIR_COUNT_TARGET = 100;
```

### Improved Pattern (Recommended)

```typescript
// config/constants.ts
export const CONFIG = {
  // Models
  models: {
    gemini: {
      name: 'gemini-2.5-flash-preview-04-17',
      maxTokens: 8000,
      contextWindow: 1000000,
    },
    openrouter: {
      name: 'anthropic/claude-3-haiku',
      maxTokens: 4000,
    },
  },

  // File handling
  files: {
    maxSize: {
      text: 5 * 1024 * 1024,    // 5MB
      binary: 2 * 1024 * 1024,  // 2MB
    },
    supportedTypes: {
      text: ['text/plain', 'text/markdown', 'text/html'],
      binary: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
    acceptedExtensions: '.txt,.md,.html,.jsonl,.pdf,.docx',
  },

  // Dataset generation
  generation: {
    qaTargetCount: 100,
    batchSize: 10,
    timeout: 30000,
  },

  // API limits
  api: {
    rateLimit: 100,           // requests per minute
    retries: 3,
    retryDelay: 1000,         // ms
  },
} as const;

// Usage in code
const maxSize = CONFIG.files.maxSize[fileType];
const model = CONFIG.models.gemini.name;
const timeout = CONFIG.generation.timeout;
```

### Environment-Specific Config

```typescript
// config/env.ts
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

export const ENV_CONFIG = {
  apiBaseUrl: isProd 
    ? 'https://api.fineformat.com'
    : 'http://localhost:3000',

  logging: {
    level: isDev ? 'debug' : 'error',
    enableConsole: isDev,
    enableSentry: isProd,
  },

  features: {
    enableWebAugmentation: isProd,
    enableSyntheticGeneration: isProd,
    enableAdvancedValidation: isProd,
  },
};

// Usage
console.log('API Base:', ENV_CONFIG.apiBaseUrl);
if (ENV_CONFIG.logging.enableConsole) {
  console.log('Debug mode enabled');
}
```

### Recommended for MVP
✅ **Centralize all constants**
✅ **Use config objects** not scattered exports
✅ **Environment-specific configs**
✅ **Document config values**
✅ **Make configs override-able** (for testing)

---

## IX. Testing Patterns

### Current State: No Tests

Fine Format lacks unit and integration tests. Here are recommended patterns.

### Unit Test Pattern

```typescript
// services/fileService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FileService } from './fileService';

describe('FileService', () => {
  describe('processFiles', () => {
    it('should accept valid text files', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await FileService.processFiles([file]);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('read');
      expect(result[0].rawContent).toBe('content');
    });

    it('should reject files exceeding size limit', async () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024);
      const file = new File([largeContent], 'large.txt');
      const result = await FileService.processFiles([file]);
      
      expect(result[0].status).toBe('failed');
      expect(result[0].error).toContain('too large');
    });

    it('should reject unsupported file types', async () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = await FileService.processFiles([file]);
      
      expect(result[0].status).toBe('failed');
      expect(result[0].error).toContain('Unsupported');
    });
  });
});
```

### Hook Test Pattern

```typescript
// hooks/useDatasetGeneration.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDatasetGeneration } from './useDatasetGeneration';
import * as geminiService from '../services/geminiService';

describe('useDatasetGeneration', () => {
  beforeEach(() => {
    vi.spyOn(geminiService, 'identifyThemes').mockResolvedValue(['theme1']);
  });

  it('should generate dataset and track progress', async () => {
    const { result } = renderHook(() => useDatasetGeneration());

    await act(async () => {
      result.current.generateDataset([], [], 'general');
    });

    expect(result.current.progress).toBe(100);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processedData).toBeDefined();
  });
});
```

### Component Test Pattern

```typescript
// components/FileUpload.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from './FileUpload';

describe('FileUpload', () => {
  it('should call onFilesChange when files are dropped', async () => {
    const onFilesChange = vi.fn();
    render(<FileUpload files={[]} onFilesChange={onFilesChange} />);

    const dropZone = screen.getByText(/drag/i).closest('div');
    const file = new File(['content'], 'test.txt');

    fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(onFilesChange).toHaveBeenCalled();
    });
  });
});
```

### Integration Test Pattern

```typescript
// __tests__/integration.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Dataset Generation Flow', () => {
  it('should complete full workflow from upload to download', async () => {
    render(<App />);

    // Upload a file
    const file = new File(['test content'], 'test.txt');
    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click generate
    const generateBtn = screen.getByText(/generate/i);
    fireEvent.click(generateBtn);

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/complete/i)).toBeInTheDocument();
    });

    // Download dataset
    const downloadBtn = screen.getByText(/download/i);
    fireEvent.click(downloadBtn);

    // Verify download happened (check if link was created)
    expect(screen.getByRole('link', { hidden: true })).toHaveAttribute('href');
  });
});
```

### Recommended Testing Stack for MVP
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",                    // Unit testing framework
    "@testing-library/react": "^14.0.0",   // Component testing
    "@testing-library/user-event": "^14.0.0", // User interactions
    "jsdom": "^23.0.0",                    // DOM environment
    "vi": "^1.0.0"                         // Mocking library
  }
}
```

### Recommended for MVP
✅ **Add unit tests** for services (60% of effort)
✅ **Add component tests** for UI (20% of effort)
✅ **Add integration tests** for critical flows (20% of effort)
✅ **Aim for 80%+ coverage** for critical paths
✅ **Test error scenarios** not just happy path

---

## X. Logging and Debugging Pattern

### Current Pattern (Console Logging)
The codebase uses console.log with prefixes:
```typescript
console.log('[GEMINI] Request successful');
console.error('[GEMINI] Request failed:', error);
```

### Improved Pattern (Structured Logging)

```typescript
// services/logger.ts
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(service: string, message: string, level: LogLevel, data?: any, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      data,
      error,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with formatting
    const prefix = `[${service}]`;
    const levelName = LogLevel[level];
    const method = level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log';
    
    console[method](`${prefix} ${message}`, data);
    if (error) console[method]('Error details:', error);
  }

  debug(service: string, message: string, data?: any) {
    if (import.meta.env.DEV) {
      this.log(service, message, LogLevel.DEBUG, data);
    }
  }

  info(service: string, message: string, data?: any) {
    this.log(service, message, LogLevel.INFO, data);
  }

  warn(service: string, message: string, data?: any) {
    this.log(service, message, LogLevel.WARN, data);
  }

  error(service: string, message: string, error: Error, context?: any) {
    this.log(service, message, LogLevel.ERROR, context, error);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();

// Usage in services
logger.debug('FileService', 'Processing file', { fileName: file.name });
logger.info('GeminiService', 'API request sent', { tokenCount: 150 });
logger.warn('GeminiService', 'High token usage', { tokens: 7000, limit: 8000 });
logger.error('FileService', 'File read failed', error, { fileName });
```

### Debugging Utilities

```typescript
// services/debugUtils.ts
export class DebugUtils {
  static traceAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    logger.debug('Performance', `Starting: ${name}`);
    
    return fn()
      .then(result => {
        const duration = performance.now() - start;
        logger.debug('Performance', `Completed: ${name}`, { duration });
        return result;
      })
      .catch(error => {
        const duration = performance.now() - start;
        logger.error('Performance', `Failed: ${name}`, error, { duration });
        throw error;
      });
  }

  static compareObjects(obj1: any, obj2: any, path = ''): string[] {
    const differences: string[] = [];
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    keys.forEach(key => {
      const newPath = path ? `${path}.${key}` : key;
      if (obj1[key] !== obj2[key]) {
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          differences.push(...this.compareObjects(obj1[key], obj2[key], newPath));
        } else {
          differences.push(`${newPath}: "${obj1[key]}" → "${obj2[key]}"`);
        }
      }
    });

    return differences;
  }
}

// Usage
await DebugUtils.traceAsync('generateDataset', () => 
  geminiService.generateQAPairs(content, themes, goal)
);
```

### Recommended for MVP
✅ **Structured logging** with levels
✅ **Service namespacing** in logs
✅ **Performance tracking**
✅ **Log export** for debugging
✅ **Conditional debug logging**

---

## Summary of Key Patterns

| Pattern | Use Case | Recommendation |
|---------|----------|-----------------|
| Service Layer | Business logic encapsulation | ✅ Adopt in MVP |
| Hook Orchestration | Complex async workflows | ✅ Adopt in MVP |
| Component Composition | UI building | ✅ Keep current |
| Type Safety | Error prevention | ✅ Strengthen in MVP |
| Error Handling | User feedback | ✅ Improve in MVP |
| Data Validation | Input safety | ✅ Add more in MVP |
| Performance Optimization | Scalability | ⚠️ Add when needed |
| Configuration Management | Flexibility | ✅ Improve in MVP |
| Testing | Quality assurance | ✅ Add in MVP |
| Logging & Debugging | Maintainability | ✅ Implement in MVP |

These patterns represent the best practices identified from the Fine Format codebase. They should be maintained and strengthened during the MVP build.
