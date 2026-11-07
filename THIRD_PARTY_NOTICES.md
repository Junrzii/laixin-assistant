# Third-party notices and source references

This standalone assistant is independently implemented in Python. No AI Virtual Phone or OVO application code or artwork is distributed in this package.

## QR Code generator — Project Nayuki

The bundled `qrcodegen.py` is unmodified upstream source, including its full MIT license header.

- Repository: https://github.com/nayuki/QR-Code-generator
- File: python/qrcodegen.py
- Pinned commit: bcfe1b018cec5f1f91b5705eca5bb4cdd34e9f8d
- License: MIT; Copyright (c) Project Nayuki.

## Weixin wire protocol reference — Tencent

- Protocol: https://github.com/Tencent/openclaw-weixin/blob/main/docs/protocol_zh_CN.md
- Version observed during implementation: 2.4.10 (2026-11-07).
- Reference only: no OpenClaw runtime or plugin is required by this assistant.
- Tencent's documentation describes observed client behaviour, not a guarantee of all server requirements. Real-account compatibility still needs validation.

The upstream Tencent MIT notice is reproduced for attribution:

Tencent is pleased to support the open source community by making openclaw-weixin available. 

Copyright (C) 2026 Tencent.  All rights reserved. 

openclaw-weixin is licensed under the MIT.


Terms of the MIT:
--------------------------------------------------------------------
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
