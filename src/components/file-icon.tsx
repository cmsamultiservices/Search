import { File, FileText, FileSpreadsheet, Presentation, FileCode2 } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface FileIconProps extends LucideProps {
  filename: string;
}

export function FileIcon({ filename, ...props }: FileIconProps) {
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  switch (extension) {
    case '.pdf':
    case '.docx':
    case '.doc':
      return <FileText {...props} />;
    case '.xlsx':
    case '.xls':
    case '.csv':
      return <FileSpreadsheet {...props} />;
    case '.pptx':
    case '.ppt':
      return <Presentation {...props} />;
    case '.txt':
    case '.md':
    case '.json':
    case '.xml':
      return <FileCode2 {...props} />;
    default:
      return <File {...props} />;
  }
}
