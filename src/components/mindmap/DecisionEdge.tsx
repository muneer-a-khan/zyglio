import React from 'react';
import { EdgeLabelRenderer, getBezierPath } from 'reactflow';

// Custom edge component with decision labels
const DecisionEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style = {}, markerEnd, label }: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  // Get the edge label with priority: explicit label > data.label > data.choice > default
  let edgeLabel = '';
  if (label) {
    edgeLabel = String(label);
  } else if (data?.label) {
    edgeLabel = String(data.label);
  } else if (data?.choice) {
    edgeLabel = String(data.choice);
  } else if (data?.isDecisionEdge) {
    if (data?.isYes) {
      edgeLabel = 'Yes';
    } else if (data?.isNo) {
      edgeLabel = 'No';
    } else {
      edgeLabel = 'Option';
    }
  }

  // Determine colors based on edge type
  let backgroundColor = '#f3f4f6';
  let textColor = '#374151';
  let borderColor = 'rgba(0,0,0,0.1)';

  if (data?.isDecisionEdge) {
    if (data?.isYes) {
      backgroundColor = '#dcfce7';
      textColor = '#166534';
      borderColor = '#10b981';
    } else if (data?.isNo) {
      backgroundColor = '#fef2f2';
      textColor = '#991b1b';
      borderColor = '#ef4444';
    } else {
      backgroundColor = '#fef3c7';
      textColor = '#92400e';
      borderColor = '#f59e0b';
    }
  } else if (data?.isFallback) {
    backgroundColor = '#f9fafb';
    textColor = '#6b7280';
    borderColor = '#d1d5db';
  }

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: backgroundColor,
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: textColor,
              pointerEvents: 'all',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: `1px solid ${borderColor}`,
              maxWidth: '120px',
              textAlign: 'center',
              wordBreak: 'break-word',
              lineHeight: '1.2',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            className="nodrag nopan"
            title={edgeLabel} // Show full text on hover
          >
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default DecisionEdge; 