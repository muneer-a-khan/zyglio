import React from 'react';
import { EdgeLabelRenderer, getBezierPath } from 'reactflow';

// Custom edge component with YES/NO labels
const DecisionEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style = {}, markerEnd }: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  // Default to true/false if no specific label is provided
  const edgeLabel = data?.label || (data?.isDecisionEdge ? (data?.isYes ? 'Yes' : 'No') : '');

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
              background: data?.isDecisionEdge ? (data?.isYes ? '#10b981' : '#ef4444') : '#f3f4f6',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: data?.isDecisionEdge ? 'white' : '#374151',
              pointerEvents: 'all',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.1)'
            }}
            className="nodrag nopan"
          >
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default DecisionEdge; 