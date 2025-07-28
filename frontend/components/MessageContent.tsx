interface MessageContentProps {
  content: string
}

export default function MessageContent({ content }: MessageContentProps) {
  // Simple markdown-like rendering
  const renderContent = () => {
    const lines = content.split('\n')
    
    return lines.map((line, index) => {
      // Bold text
      const boldRegex = /\*\*(.*?)\*\*/g
      const processedLine = line.replace(boldRegex, '<strong>$1</strong>')
      
      // Icons (emoji)
      if (processedLine.includes('📅') || processedLine.includes('⏰') || processedLine.includes('📝')) {
        return (
          <div key={index} className="my-1">
            <span dangerouslySetInnerHTML={{ __html: processedLine }} />
          </div>
        )
      }
      
      // Empty lines
      if (!line.trim()) {
        return <div key={index} className="h-2" />
      }
      
      return (
        <div key={index} dangerouslySetInnerHTML={{ __html: processedLine }} />
      )
    })
  }
  
  return <div className="text-sm whitespace-pre-wrap">{renderContent()}</div>
}