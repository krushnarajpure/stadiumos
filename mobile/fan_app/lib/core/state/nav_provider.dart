import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fan_app/core/network/api_client.dart';

class RouteNode {
  final String id;
  final String name;
  final String zoneId;
  final String type;
  final String floor;

  RouteNode({
    required this.id,
    required this.name,
    required this.zoneId,
    required this.type,
    required this.floor,
  });

  factory RouteNode.fromJson(Map<String, dynamic> json) {
    return RouteNode(
      id: json['id'],
      name: json['name'],
      zoneId: json['zone_id'],
      type: json['type'],
      floor: json['floor'],
    );
  }
}

class NavigationState {
  final List<RouteNode> path;
  final double distance;
  final double estTimeSeconds;
  final bool loading;
  final String? error;

  NavigationState({
    required this.path,
    required this.distance,
    required this.estTimeSeconds,
    required this.loading,
    this.error,
  });

  NavigationState copyWith({
    List<RouteNode>? path,
    double? distance,
    double? estTimeSeconds,
    bool? loading,
    String? error,
  }) {
    return NavigationState(
      path: path ?? this.path,
      distance: distance ?? this.distance,
      estTimeSeconds: estTimeSeconds ?? this.estTimeSeconds,
      loading: loading ?? this.loading,
      error: error ?? this.error,
    );
  }
}

class NavigationNotifier extends StateNotifier<NavigationState> {
  final ApiClient _client = ApiClient();

  NavigationNotifier() : super(NavigationState(path: [], distance: 0.0, estTimeSeconds: 0.0, loading: false));

  Future<void> fetchRoute(String start, String end, {bool requiresAccessibility = false}) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final response = await _client.dio.post(
        '/api/v1/navigation/route',
        data: {
          'start_node_id': start,
          'end_node_id': end,
          'routing_profile': 'Shortest',
          'requires_accessibility': requiresAccessibility
        },
      );
      
      final List<dynamic> nodesRaw = response.data['path_nodes'];
      final pathNodes = nodesRaw.map((n) => RouteNode.fromJson(n)).toList();
      
      state = NavigationState(
        path: pathNodes,
        distance: response.data['total_distance_meters'],
        estTimeSeconds: response.data['estimated_time_seconds'],
        loading: false,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: "Failed to load route navigation coordinates.");
    }
  }
}

final navigationProvider = StateNotifierProvider<NavigationNotifier, NavigationState>((ref) {
  return NavigationNotifier();
});
