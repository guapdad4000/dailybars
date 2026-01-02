// ============================================================================
// DAILY BARS - Beat Analyzer (Premium/Admin Feature)
// Auto-detects BPM, key, duration, and extracts ID3 metadata from audio files
// Uses Web Audio API for client-side analysis
// ============================================================================

window.BeatAnalyzer = (function() {
    'use strict';
    
    // Musical notes for key detection
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    
    // ========================================================================
    // MAIN ANALYSIS FUNCTION
    // ========================================================================
    
    async function analyzeAudio(file, options = {}) {
        const {
            detectBpm = true,
            detectKey = true,
            detectEnergy = true,
            generateWaveform = true,
            extractMetadata = true,
            onProgress = null
        } = options;
        
        const results = {
            duration: null,
            bpm: null,
            bpmConfidence: null,
            key: null,
            keyConfidence: null,
            energy: null,
            danceability: null,
            waveform: null,
            metadata: null,
            error: null
        };
        
        try {
            // Report progress
            if (onProgress) onProgress(0, 'Loading audio...');
            
            // Decode audio file
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            results.duration = audioBuffer.duration;
            
            if (onProgress) onProgress(20, 'Analyzing...');
            
            // Get audio data (mono, downsampled for analysis)
            const channelData = getMonoData(audioBuffer);
            const sampleRate = audioBuffer.sampleRate;
            
            // Run analyses in parallel where possible
            const analyses = [];
            
            if (detectBpm) {
                analyses.push(
                    detectBPM(channelData, sampleRate)
                        .then(r => { results.bpm = r.bpm; results.bpmConfidence = r.confidence; })
                );
            }
            
            if (detectKey) {
                analyses.push(
                    detectMusicalKey(channelData, sampleRate, audioContext)
                        .then(r => { results.key = r.key; results.keyConfidence = r.confidence; })
                );
            }
            
            if (detectEnergy) {
                analyses.push(
                    analyzeEnergy(channelData)
                        .then(r => { results.energy = r.energy; results.danceability = r.danceability; })
                );
            }
            
            if (generateWaveform) {
                analyses.push(
                    generateWaveformData(channelData)
                        .then(r => { results.waveform = r; })
                );
            }
            
            if (extractMetadata) {
                analyses.push(
                    extractID3Metadata(file)
                        .then(r => { results.metadata = r; })
                );
            }
            
            // Wait for all analyses
            await Promise.all(analyses);
            
            if (onProgress) onProgress(100, 'Complete');
            
            // Close audio context
            audioContext.close();
            
        } catch (error) {
            console.error('Beat analysis error:', error);
            results.error = error.message;
        }
        
        return results;
    }
    
    // ========================================================================
    // BPM DETECTION
    // Uses onset detection and autocorrelation
    // ========================================================================
    
    async function detectBPM(channelData, sampleRate) {
        return new Promise((resolve) => {
            try {
                // Downsample for faster processing
                const downsampleFactor = Math.floor(sampleRate / 11025);
                const downsampled = [];
                for (let i = 0; i < channelData.length; i += downsampleFactor) {
                    downsampled.push(channelData[i]);
                }
                
                const dsRate = sampleRate / downsampleFactor;
                
                // Calculate energy envelope
                const windowSize = Math.floor(dsRate * 0.02); // 20ms windows
                const envelope = [];
                for (let i = 0; i < downsampled.length - windowSize; i += windowSize) {
                    let energy = 0;
                    for (let j = 0; j < windowSize; j++) {
                        energy += downsampled[i + j] * downsampled[i + j];
                    }
                    envelope.push(Math.sqrt(energy / windowSize));
                }
                
                // Detect onsets (peaks in energy difference)
                const diff = [];
                for (let i = 1; i < envelope.length; i++) {
                    diff.push(Math.max(0, envelope[i] - envelope[i - 1]));
                }
                
                // Autocorrelation to find periodicity
                const minLag = Math.floor(dsRate / windowSize * 60 / 200); // 200 BPM max
                const maxLag = Math.floor(dsRate / windowSize * 60 / 60);  // 60 BPM min
                
                let bestLag = minLag;
                let bestCorr = 0;
                
                for (let lag = minLag; lag <= maxLag; lag++) {
                    let corr = 0;
                    let count = 0;
                    for (let i = 0; i < diff.length - lag; i++) {
                        corr += diff[i] * diff[i + lag];
                        count++;
                    }
                    corr /= count;
                    
                    if (corr > bestCorr) {
                        bestCorr = corr;
                        bestLag = lag;
                    }
                }
                
                // Convert lag to BPM
                const secondsPerBeat = (bestLag * windowSize) / dsRate;
                let bpm = 60 / secondsPerBeat;
                
                // Normalize to common range (60-180)
                while (bpm < 60) bpm *= 2;
                while (bpm > 180) bpm /= 2;
                
                // Calculate confidence based on autocorrelation strength
                const confidence = Math.min(1, bestCorr * 10);
                
                resolve({
                    bpm: Math.round(bpm),
                    confidence: parseFloat(confidence.toFixed(2))
                });
                
            } catch (error) {
                console.error('BPM detection error:', error);
                resolve({ bpm: null, confidence: 0 });
            }
        });
    }
    
    // ========================================================================
    // KEY DETECTION
    // Uses chroma features and Krumhansl-Schmuckler key-finding algorithm
    // ========================================================================
    
    async function detectMusicalKey(channelData, sampleRate, audioContext) {
        return new Promise((resolve) => {
            try {
                // Use a portion of the audio (first 30 seconds) for faster processing
                const maxSamples = sampleRate * 30;
                const samples = channelData.slice(0, Math.min(channelData.length, maxSamples));
                
                // FFT size for frequency analysis
                const fftSize = 4096;
                const hopSize = fftSize / 4;
                
                // Initialize chroma bins (12 pitch classes)
                const chroma = new Array(12).fill(0);
                
                // Process audio in chunks
                for (let i = 0; i < samples.length - fftSize; i += hopSize) {
                    const chunk = samples.slice(i, i + fftSize);
                    const spectrum = computeSpectrum(chunk, fftSize);
                    
                    // Map frequencies to chroma bins
                    for (let bin = 1; bin < spectrum.length / 2; bin++) {
                        const freq = bin * sampleRate / fftSize;
                        if (freq < 50 || freq > 5000) continue; // Focus on relevant range
                        
                        const pitch = 12 * Math.log2(freq / 440) + 69; // MIDI pitch
                        const chromaBin = Math.round(pitch) % 12;
                        if (chromaBin >= 0 && chromaBin < 12) {
                            chroma[chromaBin] += spectrum[bin];
                        }
                    }
                }
                
                // Normalize chroma
                const maxChroma = Math.max(...chroma);
                if (maxChroma > 0) {
                    for (let i = 0; i < 12; i++) {
                        chroma[i] /= maxChroma;
                    }
                }
                
                // Find best matching key using Krumhansl-Schmuckler algorithm
                let bestKey = 'C Major';
                let bestCorr = -Infinity;
                
                for (let root = 0; root < 12; root++) {
                    // Rotate chroma to start from root
                    const rotated = [];
                    for (let i = 0; i < 12; i++) {
                        rotated.push(chroma[(i + root) % 12]);
                    }
                    
                    // Correlate with major profile
                    const majorCorr = correlate(rotated, MAJOR_PROFILE);
                    if (majorCorr > bestCorr) {
                        bestCorr = majorCorr;
                        bestKey = NOTE_NAMES[root] + ' Major';
                    }
                    
                    // Correlate with minor profile
                    const minorCorr = correlate(rotated, MINOR_PROFILE);
                    if (minorCorr > bestCorr) {
                        bestCorr = minorCorr;
                        bestKey = NOTE_NAMES[root] + ' Minor';
                    }
                }
                
                // Confidence based on correlation strength
                const confidence = Math.max(0, Math.min(1, (bestCorr + 1) / 2));
                
                resolve({
                    key: bestKey,
                    confidence: parseFloat(confidence.toFixed(2))
                });
                
            } catch (error) {
                console.error('Key detection error:', error);
                resolve({ key: null, confidence: 0 });
            }
        });
    }
    
    // Simple DFT for spectrum analysis
    function computeSpectrum(samples, fftSize) {
        const spectrum = new Array(fftSize).fill(0);
        
        // Apply Hann window
        const windowed = samples.map((s, i) => 
            s * 0.5 * (1 - Math.cos(2 * Math.PI * i / samples.length))
        );
        
        // Compute magnitude spectrum (simplified DFT)
        for (let k = 0; k < fftSize / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < windowed.length; n++) {
                const angle = -2 * Math.PI * k * n / fftSize;
                real += windowed[n] * Math.cos(angle);
                imag += windowed[n] * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real * real + imag * imag);
        }
        
        return spectrum;
    }
    
    // Pearson correlation
    function correlate(a, b) {
        const n = a.length;
        let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumA += a[i];
            sumB += b[i];
            sumAB += a[i] * b[i];
            sumA2 += a[i] * a[i];
            sumB2 += b[i] * b[i];
        }
        
        const num = n * sumAB - sumA * sumB;
        const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
        
        return den === 0 ? 0 : num / den;
    }
    
    // ========================================================================
    // ENERGY & DANCEABILITY ANALYSIS
    // ========================================================================
    
    async function analyzeEnergy(channelData) {
        return new Promise((resolve) => {
            try {
                // RMS energy
                let sumSquares = 0;
                for (let i = 0; i < channelData.length; i++) {
                    sumSquares += channelData[i] * channelData[i];
                }
                const rms = Math.sqrt(sumSquares / channelData.length);
                
                // Normalize energy (typical RMS range 0.01-0.3)
                const energy = Math.min(1, rms / 0.2);
                
                // Danceability based on rhythmic consistency
                // (simplified: based on energy variation)
                const windowSize = Math.floor(channelData.length / 100);
                const energyValues = [];
                for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
                    let windowEnergy = 0;
                    for (let j = 0; j < windowSize; j++) {
                        windowEnergy += channelData[i + j] * channelData[i + j];
                    }
                    energyValues.push(Math.sqrt(windowEnergy / windowSize));
                }
                
                // Calculate variance
                const mean = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
                const variance = energyValues.reduce((a, b) => a + (b - mean) ** 2, 0) / energyValues.length;
                
                // Higher variance = more dynamic = potentially more danceable
                const danceability = Math.min(1, 0.5 + variance * 10);
                
                resolve({
                    energy: parseFloat(energy.toFixed(2)),
                    danceability: parseFloat(danceability.toFixed(2))
                });
                
            } catch (error) {
                console.error('Energy analysis error:', error);
                resolve({ energy: null, danceability: null });
            }
        });
    }
    
    // ========================================================================
    // WAVEFORM GENERATION
    // ========================================================================
    
    async function generateWaveformData(channelData, numBars = 100) {
        return new Promise((resolve) => {
            try {
                const samplesPerBar = Math.floor(channelData.length / numBars);
                const waveform = [];
                
                for (let i = 0; i < numBars; i++) {
                    const start = i * samplesPerBar;
                    const end = start + samplesPerBar;
                    
                    let max = 0;
                    for (let j = start; j < end && j < channelData.length; j++) {
                        const abs = Math.abs(channelData[j]);
                        if (abs > max) max = abs;
                    }
                    
                    waveform.push(parseFloat(max.toFixed(3)));
                }
                
                resolve(waveform);
                
            } catch (error) {
                console.error('Waveform generation error:', error);
                resolve(null);
            }
        });
    }
    
    // ========================================================================
    // ID3 METADATA EXTRACTION
    // ========================================================================
    
    async function extractID3Metadata(file) {
        return new Promise((resolve) => {
            try {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const buffer = e.target.result;
                    const view = new DataView(buffer);
                    
                    const metadata = {
                        title: null,
                        artist: null,
                        album: null,
                        year: null,
                        genre: null
                    };
                    
                    // Check for ID3v2 tag
                    if (buffer.byteLength >= 10) {
                        const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
                        
                        if (header === 'ID3') {
                            // ID3v2 found
                            const version = view.getUint8(3);
                            const size = ((view.getUint8(6) & 0x7F) << 21) |
                                        ((view.getUint8(7) & 0x7F) << 14) |
                                        ((view.getUint8(8) & 0x7F) << 7) |
                                        (view.getUint8(9) & 0x7F);
                            
                            // Parse ID3v2 frames
                            let offset = 10;
                            const endOffset = Math.min(10 + size, buffer.byteLength);
                            
                            while (offset < endOffset - 10) {
                                const frameId = String.fromCharCode(
                                    view.getUint8(offset),
                                    view.getUint8(offset + 1),
                                    view.getUint8(offset + 2),
                                    view.getUint8(offset + 3)
                                );
                                
                                if (frameId === '\0\0\0\0') break;
                                
                                const frameSize = (view.getUint8(offset + 4) << 24) |
                                                 (view.getUint8(offset + 5) << 16) |
                                                 (view.getUint8(offset + 6) << 8) |
                                                 view.getUint8(offset + 7);
                                
                                if (frameSize <= 0 || frameSize > 10000) {
                                    offset += 10;
                                    continue;
                                }
                                
                                // Extract text frames
                                const textFrames = {
                                    'TIT2': 'title',
                                    'TPE1': 'artist',
                                    'TALB': 'album',
                                    'TYER': 'year',
                                    'TDRC': 'year',
                                    'TCON': 'genre'
                                };
                                
                                if (textFrames[frameId]) {
                                    const encoding = view.getUint8(offset + 10);
                                    let text = '';
                                    
                                    for (let i = 1; i < frameSize && offset + 10 + i < buffer.byteLength; i++) {
                                        const char = view.getUint8(offset + 10 + i);
                                        if (char === 0) break;
                                        if (char >= 32 && char <= 126) {
                                            text += String.fromCharCode(char);
                                        }
                                    }
                                    
                                    if (text) {
                                        metadata[textFrames[frameId]] = text.trim();
                                    }
                                }
                                
                                offset += 10 + frameSize;
                            }
                        }
                    }
                    
                    // Check for ID3v1 tag at end of file
                    if (buffer.byteLength >= 128) {
                        const tagOffset = buffer.byteLength - 128;
                        const tag = String.fromCharCode(
                            view.getUint8(tagOffset),
                            view.getUint8(tagOffset + 1),
                            view.getUint8(tagOffset + 2)
                        );
                        
                        if (tag === 'TAG') {
                            // ID3v1 found - use as fallback
                            if (!metadata.title) {
                                metadata.title = extractString(view, tagOffset + 3, 30);
                            }
                            if (!metadata.artist) {
                                metadata.artist = extractString(view, tagOffset + 33, 30);
                            }
                            if (!metadata.album) {
                                metadata.album = extractString(view, tagOffset + 63, 30);
                            }
                            if (!metadata.year) {
                                const year = extractString(view, tagOffset + 93, 4);
                                if (year && /^\d{4}$/.test(year)) {
                                    metadata.year = parseInt(year);
                                }
                            }
                        }
                    }
                    
                    // Use filename as fallback title
                    if (!metadata.title && file.name) {
                        metadata.title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
                    }
                    
                    resolve(metadata);
                };
                
                reader.onerror = () => resolve(null);
                reader.readAsArrayBuffer(file);
                
            } catch (error) {
                console.error('Metadata extraction error:', error);
                resolve(null);
            }
        });
    }
    
    function extractString(view, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            const char = view.getUint8(offset + i);
            if (char === 0) break;
            if (char >= 32 && char <= 126) {
                str += String.fromCharCode(char);
            }
        }
        return str.trim() || null;
    }
    
    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    
    function getMonoData(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const mono = new Float32Array(length);
        
        // Mix all channels to mono
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                mono[i] += channelData[i] / numChannels;
            }
        }
        
        return mono;
    }
    
    // ========================================================================
    // QUICK ANALYSIS (for UI - just BPM and duration)
    // ========================================================================
    
    async function quickAnalyze(file) {
        return analyzeAudio(file, {
            detectBpm: true,
            detectKey: false,
            detectEnergy: false,
            generateWaveform: false,
            extractMetadata: true
        });
    }
    
    // ========================================================================
    // FULL ANALYSIS (for Premium/Admin users)
    // ========================================================================
    
    async function fullAnalyze(file, onProgress) {
        return analyzeAudio(file, {
            detectBpm: true,
            detectKey: true,
            detectEnergy: true,
            generateWaveform: true,
            extractMetadata: true,
            onProgress
        });
    }
    
    // ========================================================================
    // FORMAT HELPERS
    // ========================================================================
    
    function formatDuration(seconds) {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        let size = bytes;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    return {
        analyzeAudio,
        quickAnalyze,
        fullAnalyze,
        detectBPM,
        detectMusicalKey,
        analyzeEnergy,
        generateWaveformData,
        extractID3Metadata,
        formatDuration,
        formatFileSize
    };
    
})();

console.log('🎵 BeatAnalyzer loaded - Auto-detection ready for Premium/Admin users');
