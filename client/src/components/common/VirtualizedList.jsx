import React, { memo } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';

/**
 * Virtualized list component for large lists
 * Use this for rendering large message lists or chat items
 * 
 * @example
 * <VirtualizedList
 *   items={messages}
 *   height={600}
 *   itemHeight={80}
 *   renderItem={({ item, index, style }) => (
 *     <div style={style}>
 *       <MessageBubble message={item} />
 *     </div>
 *   )}
 * />
 */
const VirtualizedList = ({
  items = [],
  height = 400,
  itemHeight,
  itemSize, // For variable size lists
  width = '100%',
  renderItem,
  overscanCount = 5,
  className = '',
  useVariableSize = false,
  getItemSize, // For variable size: (index) => number
  ...props
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const ListComponent = useVariableSize ? VariableSizeList : FixedSizeList;

  const Row = memo(({ index, style }) => {
    const item = items[index];
    if (!item) return null;

    return (
      <div style={style}>
        {renderItem({ item, index, style })}
      </div>
    );
  });

  Row.displayName = 'VirtualizedRow';

  return (
    <div className={className} style={{ height, width }}>
      <ListComponent
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={useVariableSize ? getItemSize : (itemHeight || itemSize)}
        overscanCount={overscanCount}
        {...props}
      >
        {Row}
      </ListComponent>
    </div>
  );
};

export default memo(VirtualizedList);

