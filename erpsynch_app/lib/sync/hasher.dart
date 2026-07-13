import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';

String hashFile(String filePath) {
  try {
    final bytes = File(filePath).readAsBytesSync();
    return sha256.convert(bytes).toString();
  } catch (_) {
    return '';
  }
}

String hashContent(List<int> bytes) {
  return sha256.convert(bytes).toString();
}

String hashString(String content) {
  return sha256.convert(utf8.encode(content)).toString();
}
