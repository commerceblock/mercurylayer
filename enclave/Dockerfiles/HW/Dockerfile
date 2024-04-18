FROM ubuntu:22.04 as sgxbase
RUN apt-get update && apt-get install -y \
    gnupg \
    wget

RUN echo 'deb [arch=amd64] https://download.01.org/intel-sgx/sgx_repo/ubuntu jammy main' > /etc/apt/sources.list.d/intel-sgx.list
RUN wget -qO - https://download.01.org/intel-sgx/sgx_repo/ubuntu/intel-sgx-deb.key | apt-key add -
RUN apt-get update 

FROM sgxbase as sgx_sample_builder
# App build time dependencies
RUN apt-get install -y build-essential libpq-dev clang git cmake libcurl4-openssl-dev autoconf libtool libboost-dev libboost-system-dev libboost-thread-dev

WORKDIR /opt/intel
RUN wget https://download.01.org/intel-sgx/sgx-linux/2.23/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.23.100.2.bin
RUN chmod +x sgx_linux_x64_sdk_2.23.100.2.bin
RUN echo 'yes' | ./sgx_linux_x64_sdk_2.23.100.2.bin

# Add SSS dependencies
RUN git clone https://github.com/jtv/libpqxx.git && cd libpqxx && git checkout 7.8.1 && \
    cd cmake && cmake .. && cmake --build . && cmake --install .

# RUN git clone https://github.com/libcpr/cpr.git \
#     && mkdir cpr/build \
#     && cd cpr/build \
#     && cmake .. -DCPR_USE_SYSTEM_CURL=ON \
#     && cmake --build . \
#     && cmake --install .

RUN git clone https://github.com/libcpr/cpr.git

RUN cd cpr && git checkout 1.10.5

RUN cd cpr && mkdir build && cd build && cmake .. -DCPR_USE_SYSTEM_CURL=ON

RUN cd cpr/build && cmake --build .

RUN cd cpr/build && cmake --install .

RUN ldconfig

RUN git clone https://github.com/ssantos21/bc-crypto-base.git && cd bc-crypto-base && \
    ./configure && make && make install

RUN git clone https://github.com/ssantos21/bc-shamir.git && cd bc-shamir && \
    ./configure && make && make install

RUN git clone https://github.com/ssantos21/bc-bip39.git && cd bc-bip39 && \
    export CC="clang-14" && ./configure && make && make install

RUN rm sgx_linux_x64_sdk_2.23.100.2.bin && rm -rf libpqxx bc-crypto-base bc-shamir bc-bip39 cpr

COPY . /home/lockbox-sgx

WORKDIR /home/lockbox-sgx

RUN rm -rf Dockerfiles

RUN SGX_DEBUG=0 SGX_MODE=HW SGX_PRERELEASE=1 INCLUDE_SECP256K1_ZKP=1 make

FROM sgxbase as sample
RUN apt-get install -y \
    libcurl4 \
    libprotobuf-dev \
    libssl-dev \
    libpq-dev

# No AESM daemon, only AESM client side API support for launch.
# For applications requiring attestation, add libsgx-quote-ex
RUN apt-get install -y --no-install-recommends libsgx-launch libsgx-urts curl

COPY --from=sgx_sample_builder /home/lockbox-sgx/app lockbox-sgx-app
COPY --from=sgx_sample_builder /home/lockbox-sgx/enclave.signed.so .

RUN adduser -q --disabled-password --gecos "" --no-create-home sgxuser
USER sgxuser

ENTRYPOINT ["/lockbox-sgx-app"]

FROM sgxbase as aesm 
RUN apt-get install -y \
    libcurl4 \
    libprotobuf-dev \
    libssl-dev \
    make \
    kmod

# More aesm plugins, e.g libsgx-aesm-quote-ex-plugin, are needed if application requires attestation. See installation guide.
RUN apt-get install -y libsgx-aesm-launch-plugin

WORKDIR /opt/intel/sgx-aesm-service/aesm
ENV LD_LIBRARY_PATH=.
CMD ./aesm_service --no-daemon

