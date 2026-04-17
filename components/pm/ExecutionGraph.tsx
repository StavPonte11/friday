"use client";

import React, { useState, useMemo } from "react";
import { IssueRelationType, PmIssueStatus } from "@prisma/client";

interface Node {
    id: string;
    key: string;
    title: string;
    status: PmIssueStatus;
}

interface Edge {
    id: string;
    fromIssueId: string;
    toIssueId: string;
    type: IssueRelationType;
}

export function ExecutionGraph({ nodes, edges }: { nodes: Node[], edges: Edge[] }) {
    // 1. Assign Layers based on dependencies
    const nodeMap = new Map<string, Node & { x: number; y: number; layer: number }>();
    
    nodes.forEach(n => {
        nodeMap.set(n.id, { ...n, layer: 0, x: 0, y: 0 });
    });

    // Simple bellman-ford style layering
    let changed = true;
    let maxIter = 100;
    while(changed && maxIter-- > 0) {
        changed = false;
        edges.forEach(e => {
            if (e.type === "BLOCKS" || e.type === "DEPENDS_ON") {
                const parent = e.type === "BLOCKS" ? nodeMap.get(e.fromIssueId) : nodeMap.get(e.toIssueId);
                const child = e.type === "BLOCKS" ? nodeMap.get(e.toIssueId) : nodeMap.get(e.fromIssueId);
                
                if (parent && child) {
                    if (child.layer <= parent.layer) {
                        child.layer = parent.layer + 1;
                        changed = true;
                    }
                }
            }
        });
    }

    // 2. Assign X/Y coordinates based on layer
    const layerSizes = new Map<number, number>();
    const nodePositions = Array.from(nodeMap.values()).map(n => {
        const indexInLayer = layerSizes.get(n.layer) || 0;
        layerSizes.set(n.layer, indexInLayer + 1);
        
        return {
            ...n,
            x: n.layer * 250 + 100,
            y: indexInLayer * 120 + 80
        };
    });

    // Update map with final positions
    nodePositions.forEach(n => nodeMap.set(n.id, n));

    const totalWidth = (Math.max(...nodePositions.map(n => n.layer)) + 1) * 250 + 200;
    const totalHeight = (Math.max(...Array.from(layerSizes.values())) + 1) * 120 + 100;

    return (
        <div className="w-full h-full overflow-auto bg-slate-50 dark:bg-zinc-950 p-4 border rounded-xl">
            <svg 
                width={Math.max(800, totalWidth)} 
                height={Math.max(600, totalHeight)}
                className="w-full h-full min-w-[800px] min-h-[600px]"
            >
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                </defs>
                
                {/* Edges */}
                {edges.map(e => {
                    const fromNode = nodeMap.get(e.fromIssueId);
                    const toNode = nodeMap.get(e.toIssueId);
                    if (!fromNode || !toNode) return null;

                    return (
                        <line 
                            key={e.id}
                            x1={fromNode.x + 150} // Node width offset
                            y1={fromNode.y + 30}  // Node height offset
                            x2={toNode.x}
                            y2={toNode.y + 30}
                            stroke="#cbd5e1"
                            strokeWidth={2}
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}

                {/* Nodes */}
                {nodePositions.map((n) => (
                    <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                        <rect 
                            width={150} 
                            height={60} 
                            rx={8} 
                            fill="white" 
                            stroke="#e2e8f0" 
                            strokeWidth={1} 
                            className="shadow-sm drop-shadow-sm dark:fill-zinc-900 dark:stroke-zinc-800"
                        />
                        <text x={10} y={25} fontSize={12} fill="#64748b" className="font-semibold">{n.key}</text>
                        <text x={10} y={45} fontSize={12} fill="#0f172a" className="dark:fill-zinc-300">
                            {n.title.length > 20 ? n.title.substring(0, 18) + "..." : n.title}
                        </text>
                        
                        {/* Status dot */}
                        <circle cx={140} cy={15} r={4} fill={
                            n.status === "DONE" ? "#22c55e" : 
                            n.status === "IN_PROGRESS" ? "#3b82f6" : "#cbd5e1"
                        } />
                    </g>
                ))}
            </svg>
        </div>
    );
}
