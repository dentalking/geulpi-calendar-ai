import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { ImageIcon, UploadIcon, XIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { announceToScreenReader, handleKeyboardNavigation, KEYS } from '@/utils/accessibility';

interface ImageDropzoneProps {
  onImageAccepted: (file: File, base64: string) => void;
  isProcessing?: boolean;
}

export default function ImageDropzone({ onImageAccepted, isProcessing = false }: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);
        setFileName(file.name);

        // Announce to screen readers
        announceToScreenReader(`이미지 "${file.name}"이 업로드되어 처리 중입니다`, 'polite');

        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result?.toString().split(',')[1] || '';
          onImageAccepted(file, base64);
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const clearImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setFileName(null);
    announceToScreenReader('업로드된 이미지가 제거되었습니다', 'polite');
  };

  const getDropzoneStyle = () => {
    const baseStyle = 'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer';
    
    if (isProcessing) return `${baseStyle} border-gray-300 bg-gray-50 cursor-not-allowed`;
    if (isDragReject) return `${baseStyle} border-red-500 bg-red-50`;
    if (isDragAccept) return `${baseStyle} border-green-500 bg-green-50`;
    if (isDragActive) return `${baseStyle} border-blue-500 bg-blue-50`;
    return `${baseStyle} border-gray-300 hover:border-gray-400 hover:bg-gray-50`;
  };

  return (
    <Card className="p-4">
      {!preview ? (
        <div 
          {...getRootProps({ 
            className: getDropzoneStyle(),
            role: 'button',
            'aria-label': '이미지 업로드 영역. 클릭하거나 드래그하여 이미지를 업로드하세요',
            'aria-describedby': 'dropzone-instructions',
            tabIndex: 0
          })}
        >
          <input {...getInputProps()} data-testid="image-upload" />
          <div className="flex flex-col items-center justify-center text-center">
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3" aria-hidden="true" />
                <p className="text-sm text-gray-600" role="status" aria-live="polite">이미지 처리 중...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-400 mb-3" aria-hidden="true" />
                {isDragActive ? (
                  <p className="text-sm text-gray-600" role="status" aria-live="polite">여기에 이미지를 놓으세요...</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-1">
                      드래그 앤 드롭으로 이미지를 업로드하거나 클릭하여 선택하세요
                    </p>
                    <p id="dropzone-instructions" className="text-xs text-gray-500">
                      지원 형식: PNG, JPG, JPEG, GIF, BMP, WebP
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3" role="region" aria-label="업로드된 이미지 미리보기">
          <div className="relative rounded-lg overflow-hidden bg-gray-100 h-48">
            <Image
              src={preview}
              alt={`업로드된 이미지 미리보기: ${fileName || '이미지'}`}
              fill
              className="object-contain"
              onLoad={() => URL.revokeObjectURL(preview)}
              unoptimized
            />
            {!isProcessing && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 z-10"
                onClick={clearImage}
                aria-label="이미지 제거"
              >
                <XIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate flex-1" aria-label={`파일명: ${fileName}`}>
              {fileName}
            </p>
            {isProcessing && (
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" aria-hidden="true" />
                <span className="text-sm text-blue-600">텍스트 추출 중...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}