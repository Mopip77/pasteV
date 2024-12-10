import * as React from "react"
import { createPortal } from "react-dom"
import { X, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface MultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  onInputChange?: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(({
  value,
  onChange,
  onInputChange,
  options,
  placeholder,
  className,
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const filteredOptions = React.useMemo(() => 
    options.filter(option => !value.includes(option)),
    [options, value]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    onInputChange?.(e.target.value)
    setSelectedIndex(-1)
  }

  const handleSelect = (option: string) => {
    if (!value.includes(option)) {
      onChange([...value, option])
    }
    setInputValue("")
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.stopPropagation()
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.stopPropagation()
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.stopPropagation()
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[selectedIndex])
        }
        break
      case 'Escape':
        e.stopPropagation()
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [filteredOptions])

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
    inputRef.current?.focus()
  }

  const getDropdownPosition = () => {
    if (!containerRef.current) return {}
    const rect = containerRef.current.getBoundingClientRect()
    return {
      position: 'absolute' as const,
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      minWidth: `${rect.width}px`,
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div 
        className={cn(
          "flex h-10 items-center overflow-x-auto overflow-y-hidden gap-2 min-w-[120px] max-w-[400px] w-fit px-2 text-sm border rounded-md focus-within:ring-2 ring-offset-background scrollbar-none",
          className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-nowrap gap-2 w-fit">
          {value.map(tag => (
            <span key={tag} className="flex-shrink-0 flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-md">
              <span>{tag}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(tag);
                }} 
                className="hover:bg-blue-200 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => {
                if (document.activeElement !== inputRef.current) {
                  setIsOpen(false)
                  setSelectedIndex(-1)
                }
              }, 200)
            }}
            className="w-16 outline-none bg-transparent"
            placeholder={value.length === 0 ? placeholder : ""}
          />
        </div>
        {value.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex-shrink-0 ml-1 p-1 hover:bg-gray-100 rounded-full"
          >
            <XCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && createPortal(
        <div 
          className="bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-[9999]"
          style={getDropdownPosition()}
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option}
              className={cn(
                "px-3 py-2 cursor-pointer whitespace-nowrap",
                index === selectedIndex ? "bg-blue-100" : "hover:bg-gray-100"
              )}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(option)
              }}
            >
              {option}
            </div>
          ))}
        </div>,
        document.getElementById('dropdown-portal')!
      )}
    </div>
  )
})

MultiSelect.displayName = "MultiSelect"