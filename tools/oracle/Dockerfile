# Oracle runner: QEMU (PC emulator) + mtools, to run FreeDOS + MSX88/ASM88/LINK88
# headless. QEMU's monitor lets the driver send keys and read the text screen.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends qemu-system-x86 mtools python3 \
 && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 oracle
USER oracle
WORKDIR /work
