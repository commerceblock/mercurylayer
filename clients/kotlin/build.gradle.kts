plugins {
    kotlin("jvm") version "1.9.23"
    kotlin("plugin.serialization") version "1.9.23"
}

group = "org.example"
version = "1.0-SNAPSHOT"

repositories {
    google()
    mavenCentral()
    maven { url = uri("https://jitpack.io") }
}

val ktor_version: String by project

dependencies {
    testImplementation(kotlin("test"))
    implementation("net.java.dev.jna:jna:5.14.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
    implementation("com.github.ajalt.clikt:clikt:4.4.0")
    implementation("com.squareup.okio:okio:3.9.0")
    implementation("com.akuleshov7:ktoml-core:0.5.1")
    implementation("com.akuleshov7:ktoml-file:0.5.1")
    implementation("io.ktor:ktor-client-core:$ktor_version")
    implementation("io.ktor:ktor-client-cio:$ktor_version")
    implementation("io.ktor:ktor-client-content-negotiation:$ktor_version")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktor_version")
    implementation("org.slf4j:slf4j-nop:2.1.0-alpha1")
    implementation("org.slf4j:slf4j-api:2.1.0-alpha1")
    // implementation("org.bitcoindevkit:bdk-jvm:1.0.0-alpha.9")
    implementation("com.github.bitcoinj:bitcoinj:release-0.16-SNAPSHOT")
    implementation("com.github.spindj:electrumj:11eb7ceef7")
    implementation("org.xerial:sqlite-jdbc:3.45.3.0")
}

tasks.test {
    useJUnitPlatform()
}
kotlin {
    jvmToolchain(21)
}