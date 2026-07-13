import 'dart:convert';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'signaling.dart';

class Transport {
  final SignalingClient signaling;
  final bool initiator;
  RTCPeerConnection? _pc;
  RTCDataChannel? _dataChannel;
  Function(Map<String, dynamic>)? onMessage;
  Function()? onConnected;
  Function()? onDisconnected;

  Transport({required this.signaling, required this.initiator}) {
    _setupPeerConnection();
  }

  Future<void> _setupPeerConnection() async {
    final config = {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
      ],
    };

    _pc = await createPeerConnection(config);

    if (initiator) {
      _dataChannel = await _pc!.createDataChannel('sync', RTCDataChannelInit());
      _dataChannel!.onMessage = (message) {
        final data = jsonDecode(message.text);
        onMessage?.call(data);
      };
      _dataChannel!.onDataChannelState = (state) {
        if (state == RTCDataChannelState.RTCDataChannelOpen) onConnected?.call();
      };
    }

    _pc!.onDataChannel = (channel) {
      _dataChannel = channel;
      channel.onMessage = (message) {
        final data = jsonDecode(message.text);
        onMessage?.call(data);
      };
      channel.onDataChannelState = (state) {
        if (state == RTCDataChannelState.RTCDataChannelOpen) onConnected?.call();
      };
    };

    _pc!.onIceCandidate = (candidate) {
      signaling.send(SignalingMessage(
        type: 'ice-candidate', from: signaling.peerId, data: candidate.toMap(),
      ));
    };

    signaling.onMessage = (msg) {
      if (msg.type == 'offer' && !initiator) {
        _pc!.setRemoteDescription(
          RTCSessionDescription(msg.data['sdp'], msg.data['type']),
        ).then((_) {
          _pc!.createAnswer().then((desc) {
            _pc!.setLocalDescription(desc);
            signaling.send(SignalingMessage(
              type: 'answer', from: signaling.peerId, data: desc.toMap(),
            ));
          });
        });
      } else if (msg.type == 'answer' && initiator) {
        _pc!.setRemoteDescription(
          RTCSessionDescription(msg.data['sdp'], msg.data['type']),
        );
      } else if (msg.type == 'ice-candidate') {
        _pc!.addCandidate(RTCIceCandidate(
          msg.data['candidate'], msg.data['sdpMid'], msg.data['sdpMLineIndex'],
        ));
      }
    };

    if (initiator) {
      final offer = await _pc!.createOffer();
      await _pc!.setLocalDescription(offer);
      signaling.send(SignalingMessage(
        type: 'offer', from: signaling.peerId, data: offer.toMap(),
      ));
    }
  }

  void send(Map<String, dynamic> data) {
    _dataChannel?.send(RTCDataChannelMessage(jsonEncode(data)));
  }

  void dispose() {
    _dataChannel?.close();
    _pc?.close();
  }
}
