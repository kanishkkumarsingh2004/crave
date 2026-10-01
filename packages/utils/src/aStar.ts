import { haversineDistanceKm } from "./geo";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface GraphNode {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  distanceKm: number;
  roadName: string;
}

export interface NavigationStep {
  instruction: string;
  distanceKm: number;
  estimatedMins: number;
}

export interface AStarRouteResult {
  path: GeoPoint[];
  totalDistanceKm: number;
  estimatedMins: number;
  steps: NavigationStep[];
  startPoint: GeoPoint;
  endPoint: GeoPoint;
}

/**
 * Built-in Road Graph Network (Hyperlocal City Road Grid - Koramangala / Bengaluru)
 * Represents intersections and major connecting roads.
 */
export const DEFAULT_ROAD_NODES: GraphNode[] = [
  { id: "node-1", latitude: 12.9345, longitude: 77.6101, name: "Koramangala 4th Block Signal" },
  { id: "node-2", latitude: 12.9352, longitude: 77.6142, name: "8th Main Road Junction" },
  { id: "node-3", latitude: 12.9368, longitude: 77.6185, name: "Sony World Signal Junction" },
  { id: "node-4", latitude: 12.9385, longitude: 77.6221, name: "100ft Ring Road Cross" },
  { id: "node-5", latitude: 12.9321, longitude: 77.6125, name: "Market Street Entrance" },
  { id: "node-6", latitude: 12.9338, longitude: 77.6167, name: "Station Area Cross Road" },
  { id: "node-7", latitude: 12.9359, longitude: 77.6204, name: "7th Block Commercial Lane" },
  { id: "node-8", latitude: 12.9392, longitude: 77.6248, name: "Outer Ring Road Ramp" },
  { id: "node-9", latitude: 12.9308, longitude: 77.6085, name: "Forum Mall Intersection" },
  { id: "node-10", latitude: 12.9412, longitude: 77.6275, name: "Ejipura Main Road" },
];

export const DEFAULT_ROAD_EDGES: GraphEdge[] = [
  { from: "node-9", to: "node-1", distanceKm: 0.45, roadName: "Hosur Main Road" },
  { from: "node-1", to: "node-2", distanceKm: 0.48, roadName: "8th Main Road" },
  { from: "node-2", to: "node-3", distanceKm: 0.52, roadName: "Koramangala 80ft Road" },
  { from: "node-3", to: "node-4", distanceKm: 0.45, roadName: "100ft Ring Road" },
  { from: "node-4", to: "node-8", distanceKm: 0.35, roadName: "Ring Road Express" },
  { from: "node-8", to: "node-10", distanceKm: 0.42, roadName: "Ejipura Highway link" },
  { from: "node-1", to: "node-5", distanceKm: 0.38, roadName: "Market Street Link" },
  { from: "node-5", to: "node-6", distanceKm: 0.49, roadName: "Station Access Road" },
  { from: "node-6", to: "node-7", distanceKm: 0.47, roadName: "7th Block Alley" },
  { from: "node-7", to: "node-4", distanceKm: 0.34, roadName: "Ring Road Slip Road" },
  { from: "node-2", to: "node-6", distanceKm: 0.32, roadName: "Cross Cut Road 2" },
  { from: "node-3", to: "node-7", distanceKm: 0.28, roadName: "Cross Cut Road 3" },
];

/**
 * Finds the closest graph node to a given GPS coordinate.
 */
export function findNearestNode(point: GeoPoint, nodes: GraphNode[] = DEFAULT_ROAD_NODES): GraphNode {
  let minDistance = Infinity;
  let nearest = nodes[0];

  for (const node of nodes) {
    const dist = haversineDistanceKm(point.latitude, point.longitude, node.latitude, node.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = node;
    }
  }

  return nearest;
}

/**
 * Priority Queue Node for A* Search.
 */
interface PriorityNode {
  id: string;
  fScore: number;
}

/**
 * Executes A* (A-Star) Pathfinding Algorithm over road network graph.
 * Uses Euclidean/Haversine distance to target node as admissible heuristic h(n).
 */
export function findShortestPathAStar(
  start: GeoPoint,
  destination: GeoPoint,
  nodes: GraphNode[] = DEFAULT_ROAD_NODES,
  edges: GraphEdge[] = DEFAULT_ROAD_EDGES,
): AStarRouteResult {
  const startNode = findNearestNode(start, nodes);
  const targetNode = findNearestNode(destination, nodes);

  // Build adjacency list for graph traversal (bidirectional edges)
  const adjacencyMap = new Map<string, Array<{ to: string; distance: number; roadName: string }>>();
  nodes.forEach((n) => adjacencyMap.set(n.id, []));

  edges.forEach((edge) => {
    adjacencyMap.get(edge.from)?.push({ to: edge.to, distance: edge.distanceKm, roadName: edge.roadName });
    adjacencyMap.get(edge.to)?.push({ to: edge.from, distance: edge.distanceKm, roadName: edge.roadName });
  });

  const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));

  // Heuristic function h(nodeId) -> Haversine distance to target node
  const heuristic = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return 0;
    return haversineDistanceKm(node.latitude, node.longitude, targetNode.latitude, targetNode.longitude);
  };

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, { prevId: string; roadName: string; stepDistance: number }>();
  const openSet: PriorityNode[] = [];

  nodes.forEach((n) => {
    gScore.set(n.id, Infinity);
    fScore.set(n.id, Infinity);
  });

  gScore.set(startNode.id, 0);
  const startF = heuristic(startNode.id);
  fScore.set(startNode.id, startF);
  openSet.push({ id: startNode.id, fScore: startF });

  while (openSet.length > 0) {
    // Pop node with smallest fScore
    openSet.sort((a, b) => a.fScore - b.fScore);
    const current = openSet.shift()!;

    if (current.id === targetNode.id) {
      break;
    }

    const currentG = gScore.get(current.id) ?? Infinity;
    const neighbors = adjacencyMap.get(current.id) || [];

    for (const neighbor of neighbors) {
      const tentativeG = currentG + neighbor.distance;

      if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, {
          prevId: current.id,
          roadName: neighbor.roadName,
          stepDistance: neighbor.distance,
        });

        gScore.set(neighbor.to, tentativeG);
        const estimatedF = tentativeG + heuristic(neighbor.to);
        fScore.set(neighbor.to, estimatedF);

        if (!openSet.some((n) => n.id === neighbor.to)) {
          openSet.push({ id: neighbor.to, fScore: estimatedF });
        }
      }
    }
  }

  // Reconstruct path nodes from target back to start
  const pathNodes: GraphNode[] = [];
  const rawSteps: Array<{ roadName: string; distanceKm: number }> = [];
  let currId: string | undefined = targetNode.id;

  while (currId) {
    const node = nodeMap.get(currId);
    if (node) pathNodes.unshift(node);

    const edgeInfo = cameFrom.get(currId);
    if (edgeInfo) {
      rawSteps.unshift({ roadName: edgeInfo.roadName, distanceKm: edgeInfo.stepDistance });
      currId = edgeInfo.prevId;
    } else {
      currId = undefined;
    }
  }

  // Combine start point, graph path waypoints, and end point
  const fullPath: GeoPoint[] = [
    start,
    ...pathNodes.map((n) => ({ latitude: n.latitude, longitude: n.longitude, name: n.name })),
    destination,
  ];

  // Calculate total path distance and travel time
  let totalDistanceKm = 0;
  for (let i = 0; i < fullPath.length - 1; i++) {
    totalDistanceKm += haversineDistanceKm(
      fullPath[i].latitude,
      fullPath[i].longitude,
      fullPath[i + 1].latitude,
      fullPath[i + 1].longitude,
    );
  }

  // Average city delivery speed: 25 km/h -> ~2.4 mins per km
  const estimatedMins = Math.max(1, Math.round(totalDistanceKm * 2.4 + 2));

  // Build turn-by-turn navigation instructions
  const steps: NavigationStep[] = [];
  if (rawSteps.length > 0) {
    rawSteps.forEach((step) => {
      steps.push({
        instruction: `Head along ${step.roadName}`,
        distanceKm: Number(step.distanceKm.toFixed(2)),
        estimatedMins: Math.max(1, Math.round(step.distanceKm * 2.4)),
      });
    });
  } else {
    steps.push({
      instruction: `Head directly towards ${destination.name || "Destination"}`,
      distanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedMins: estimatedMins,
    });
  }

  return {
    path: fullPath,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    estimatedMins,
    steps,
    startPoint: start,
    endPoint: destination,
  };
}
