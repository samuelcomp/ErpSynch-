import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class SignalingMessage {
  final String type;
  final String from;
  final String? to;
  final dynamic data;

  SignalingMessage({required this.type, required this.from, this.to, this.data});

  Map<String, dynamic> toJson() => {
    'type': type, 'from': from, if (to != null) 'to': to, if (data != null) 'data': data,
  };

  factory SignalingMessage.fromJson(Map<String, dynamic> json) => SignalingMessage(
    type: json['type'] ?? '', from: json['from'] ?? '', to: json['to'], data: json['data'],
  );
}

class SignalingClient {
  final String serverUrl;
  final String peerId;
  WebSocketChannel? _channel;
  Function(SignalingMessage)? onMessage;
  Function()? onDisconnected;
  Function()? onConnected;

  SignalingClient({required this.serverUrl, required this.peerId});

  Future<void> connect() async {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(serverUrl));
      await _channel!.ready;
      send(SignalingMessage(type: 'join', from: peerId));
      onConnected?.call();
      _channel!.stream.listen(
        (data) {
          final msg = SignalingMessage.fromJson(jsonDecode(data));
          onMessage?.call(msg);
        },
        onDone: () => onDisconnected?.call(),
      );
    } catch (_) {
      onDisconnected?.call();
    }
  }

  void send(SignalingMessage message) {
    _channel?.sink.add(jsonEncode(message.toJson()));
  }

  void disconnect() {
    _channel?.sink.close();
  }
}
