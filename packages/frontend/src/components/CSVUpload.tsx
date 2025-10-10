import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { BankType } from '../types/csvBank';

interface CSVUploadProps {
  onUpload: (file: File, bankType: BankType) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string | null;
}

const BANK_TYPES: { value: BankType; label: string }[] = [
  { value: 'KB_KOOKMIN', label: 'KB 국민은행' },
  { value: 'SHINHAN', label: '신한은행' },
  { value: 'WOORI', label: '우리은행' },
  { value: 'HANA', label: '하나은행' },
  { value: 'NH', label: 'NH 농협은행' },
  { value: 'DEFAULT', label: '기타/일반 형식' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CSVUpload({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
  error = null,
}: CSVUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankType>('DEFAULT');
  const [validationError, setValidationError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setValidationError('파일 크기는 5MB를 초과할 수 없습니다.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setValidationError('CSV 파일만 업로드 가능합니다.');
      } else {
        setValidationError('파일 업로드에 실패했습니다.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setValidationError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('파일을 선택해주세요.');
      return;
    }

    try {
      await onUpload(selectedFile, selectedBank);
      setSelectedFile(null);
    } catch (err) {
      // Error handled by parent component
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Bank Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          은행 선택
        </label>
        <select
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value as BankType)}
          disabled={isUploading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {BANK_TYPES.map((bank) => (
            <option key={bank.value} value={bank.value}>
              {bank.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-4">
          {isDragActive ? (
            <p className="text-sm text-blue-600 font-medium">
              파일을 여기에 놓으세요
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                CSV 파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-xs text-gray-500 mt-1">
                최대 파일 크기: 5MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>업로드 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Errors */}
      {(validationError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{validationError || error}</p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isUploading ? '업로드 중...' : '업로드 및 파싱'}
      </button>
    </div>
  );
}
