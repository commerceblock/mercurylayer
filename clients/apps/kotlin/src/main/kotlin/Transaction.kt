import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*

class Transaction() {

    companion object {

        private suspend fun signFirst(clientConfig: ClientConfig, signFirstRequestPayload: SignFirstRequestPayload): String {

            val url = clientConfig.statechainEntity + "/" + "sign/first"

            val httpClient = HttpClient(CIO) {
                install(ContentNegotiation) {
                    json()
                }
            }

            val signFirstResponsePayload: SignFirstResponsePayload = httpClient.post(url) {
                contentType(ContentType.Application.Json)
                setBody(signFirstRequestPayload)
            }.body()

            httpClient.close()

            var serverPubNonceHex = signFirstResponsePayload.serverPubnonce

            if (serverPubNonceHex.startsWith("0x")) {
                serverPubNonceHex = serverPubNonceHex.substring(2)
            }

            return serverPubNonceHex
        }

        private suspend fun signSecond(clientConfig: ClientConfig, partialSigRequest: PartialSignatureRequestPayload) : String {

            val url = clientConfig.statechainEntity + "/" + "sign/second"

            val httpClient = HttpClient(CIO) {
                install(ContentNegotiation) {
                    json()
                }
            }

            val partialSignatureResponsePayload: PartialSignatureResponsePayload = httpClient.post(url) {
                contentType(ContentType.Application.Json)
                setBody(partialSigRequest)
            }.body()

            httpClient.close()

            var partialSigHex = partialSignatureResponsePayload.partialSig

            if (partialSigHex.startsWith("0x")) {
                partialSigHex = partialSigHex.substring(2)
            }

            return partialSigHex
        }

        suspend fun create(
            coin: Coin,
            clientConfig: ClientConfig,
            blockHeight: UInt?,
            qtBackupTx: UInt,
            toAddress: String,
            network: String,
            isWithdrawal: Boolean,
            feeRate: UInt?
        ) : String {
            val coinNonce = createAndCommitNonces(coin)
            coin.secretNonce = coinNonce.secretNonce
            coin.publicNonce = coinNonce.publicNonce
            coin.blindingFactor = coinNonce.blindingFactor

            coin.serverPublicNonce = signFirst(clientConfig, coinNonce.signFirstRequestPayload)

            var newBlockHeight: UInt = 0u

            if (blockHeight == null) {
                val electrumClient = getElectrumClient(clientConfig)

                val blockHeader = electrumClient.blockchainHeadersSubscribe()
                newBlockHeight = blockHeader.height.toUInt();

                electrumClient.closeConnection()
            } else {
                newBlockHeight = blockHeight
            }

            val infoConfig = getInfoConfig(clientConfig)

            val initlock = infoConfig.initlock;
            val interval = infoConfig.interval;

            val feeRateSatsPerByte = feeRate ?: infoConfig.feeRateSatsPerByte.toUInt()

            val partialSigRequest = getPartialSigRequest(
                coin,
                newBlockHeight,
                initlock,
                interval,
                feeRateSatsPerByte,
                qtBackupTx,
                toAddress,
                network,
                isWithdrawal)

            val serverPartialSigRequest = partialSigRequest.partialSignatureRequestPayload

            val serverPartialSig = signSecond(clientConfig, serverPartialSigRequest)

            val clientPartialSig = partialSigRequest.clientPartialSig
            val msg = partialSigRequest.msg
            val session = partialSigRequest.encodedSession
            val outputPubkey = partialSigRequest.outputPubkey

            val signature = createSignature(msg, clientPartialSig, serverPartialSig, session, outputPubkey)

            val encodedUnsignedTx = partialSigRequest.encodedUnsignedTx

            val signedTx = newBackupTransaction(encodedUnsignedTx, signature)

            return signedTx
        }
    }

}