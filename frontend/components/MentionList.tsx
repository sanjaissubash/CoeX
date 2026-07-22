import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

interface MentionListProps {
  items: string[];
  command: (item: { id: string }) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="bg-popover border border-border rounded-lg shadow-md overflow-hidden p-1 flex flex-col gap-0.5 min-w-[150px]">
      {props.items.length ? props.items.map((item, index) => (
        <button
          className={`flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md w-full transition-colors ${
            index === selectedIndex
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
          }`}
          key={index}
          onClick={() => selectItem(index)}
        >
          <span className="font-mono font-bold text-red-500">@</span>
          <span className="font-semibold">{item}</span>
        </button>
      )) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">No result</div>
      )}
    </div>
  )
})

MentionList.displayName = 'MentionList'
