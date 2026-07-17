/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { Node, Edge } from "@xyflow/react";
import { BuilderNodeData, NodeKind } from "./types";

export const uid = () =>
  `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const defaultsByKind: Record<NodeKind, Partial<BuilderNodeData>> = {
  start: { kind: "start", label: "Start" },
  conditions: {
    kind: "conditions",
    label: "Conditions",
    conditionType: "keyword",
    keywords: [],
    matchType: "any",
  },
  custom_reply: {
    kind: "custom_reply",
    label: "Message",
    message: "",
    buttons: [],
  },
  user_reply: {
    kind: "user_reply",
    label: "Question",
    question: "",
    saveAs: "",
    buttons: [
      { id: "answer1", text: "Answer 1", action: "next" },
      { id: "default", text: "Default", action: "next" },
    ],
  },
  time_gap: { kind: "time_gap", label: "Delay", delay: 60 },
  send_template: { kind: "send_template", label: "Template", templateId: "" },
  assign_user: { kind: "assign_user", label: "Assign User", assigneeId: "" },
  webhook: {
    kind: "webhook",
    label: "Webhook",
    webhookUrl: "",
    webhookMethod: "POST",
    webhookHeaders: {},
    webhookBody: "",
  },
  end: { kind: "end", label: "End", endMessage: "" },
  add_to_group: {
    kind: "add_to_group",
    label: "Add to Group",
    groupId: "",
    groupName: "",
  },
  update_contact: {
    kind: "update_contact",
    label: "Update Contact",
    contactField: "name",
    contactFieldValue: "",
  },
  set_variable: {
    kind: "set_variable",
    label: "Set Variable",
    variableName: "",
    variableValue: "",
    variableSource: "static",
  },
  send_location: {
    kind: "send_location",
    label: "Send Location",
    latitude: "",
    longitude: "",
    locationName: "",
    locationAddress: "",
  },
  send_list_message: {
    kind: "send_list_message",
    label: "List Message",
    message: "",
    listButtonText: "View Options",
    listSections: [
      {
        title: "Options",
        rows: [{ id: uid(), title: "Option 1", description: "" }],
      },
    ],
  },
  send_media: {
    kind: "send_media",
    label: "Send Media",
    mediaType: "image",
    mediaUrl: "",
    mediaCaption: "",
  },
  mark_as_read: {
    kind: "mark_as_read",
    label: "Mark as Read",
  },
};

export function transformAutomationToFlow(automation: any): {
  nodes: Node<BuilderNodeData>[];
  edges: Edge[];
} {
  if (!automation || !automation.automation_nodes) {
    return {
      nodes: [
        {
          id: "start",
          type: "start",
          position: { x: 200, y: 40 },
          data: { ...(defaultsByKind.start as BuilderNodeData) },
        },
      ],
      edges: [],
    };
  }

  const nodes: Node<BuilderNodeData>[] = [
    {
      id: "start",
      type: "start",
      position: { x: 200, y: 40 },
      data: { ...(defaultsByKind.start as BuilderNodeData) },
    },
  ];

  const sortedNodes = [...automation.automation_nodes].sort(
    (a: any, b: any) => a.position - b.position
  );

  sortedNodes.forEach((autoNode: any, index: number) => {
    const nodeData: BuilderNodeData = {
      kind: autoNode.type as NodeKind,
      label: defaultsByKind[autoNode.type as NodeKind]?.label || autoNode.type,
      ...autoNode.data,
    };

    const reactFlowNode: Node<BuilderNodeData> = {
      id: autoNode.nodeId,
      type: autoNode.type,
      position:
        autoNode.position &&
        autoNode.position.x !== undefined &&
        autoNode.position.y !== undefined
          ? { x: autoNode.position.x, y: autoNode.position.y }
          : { x: 200, y: 140 + index * 140 },
      data: nodeData,
    };

    nodes.push(reactFlowNode);
  });

  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  if (automation.automation_edges && automation.automation_edges.length > 0) {
    automation.automation_edges.forEach((edge: any) => {
      const source = edge.source || edge.sourceNodeId;
      const target = edge.target || edge.targetNodeId;

      if (!source || !target) return;

      const edgeKey = `${source}-${target}`;

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: edge.id || `edge-${source}-${target}`,
          source: source,
          target: target,
          sourceHandle: edge.sourceHandle || undefined,
          type: "custom",
          animated: true,
        });
      }
    });
  } else {
    let previousNodeId = "start";
    sortedNodes.forEach((autoNode: any) => {
      const edgeKey = `${previousNodeId}-${autoNode.nodeId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `edge-${previousNodeId}-${autoNode.nodeId}`,
          source: previousNodeId,
          target: autoNode.nodeId,
          type: "custom",
          animated: true,
        });
      }
      previousNodeId = autoNode.nodeId;
    });
  }

  return { nodes, edges };
}
