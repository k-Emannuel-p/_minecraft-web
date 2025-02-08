// terrainWorker.js

// terrainWorker.js

const biomes = {
    Desert: {
        amplitude: 1,
        roughness: 0.8,
        texturePack: 'desert'
    },
    Forest: {
        amplitude: 1.2,
        roughness: 0.5,
        texturePack: 'plane'
    },
    Tundra: {
        amplitude: 0.8,
        roughness: 0.7,
        texturePack: 'snow'
    }
};

// Tamanho das regiões de bioma (em chunks)
const BIOME_REGION_SIZE = 2;

// Função determinística para selecionar bioma baseado em coordenadas de região
function getBiomeForRegion(chunkX, chunkZ) {
    // Calcula coordenadas da região
    const regionX = Math.floor(chunkX / BIOME_REGION_SIZE);
    const regionZ = Math.floor(chunkZ / BIOME_REGION_SIZE);
    
    // Gera seed única para a região
    const seed = regionX * 12345 + regionZ;
    
    // Simples gerador de números pseudo-aleatórios
    let random = Math.sin(seed) * 10000;
    random = random - Math.floor(random);
    
    // Seleciona bioma baseado no valor randômico
    const biomeKeys = Object.keys(biomes);
    const biomeIndex = Math.floor(random * biomeKeys.length);
    
    return biomes[biomeKeys[biomeIndex]];
}

// Função pesada no segundo plano
function diamondSquare(amplitude, size, roughness) {
    const grid = Array.from({ length: size }, () => new Array(size).fill(0));
    let step = size - 1;
    let currentAmplitude = amplitude;

    // Inicialização otimizada
    grid[0][0] = amplitude * 0.5;
    grid[0][step] = amplitude * 0.5;
    grid[step][0] = amplitude * 0.5;
    grid[step][step] = amplitude * 0.5;

    while (step > 1) {
        const halfStep = step >> 1;
        const scale = currentAmplitude * roughness;

        // Fase Diamond
        for (let x = halfStep; x < size; x += step) {
            for (let y = halfStep; y < size; y += step) {
                const avg = (
                    grid[x - halfStep][y - halfStep] +
                    grid[x - halfStep][y + halfStep] +
                    grid[x + halfStep][y - halfStep] +
                    grid[x + halfStep][y + halfStep]
                ) * 0.25;
                grid[x][y] = avg + (Math.random() - 0.5) * scale;
            }
        }

        // Fase Square otimizada
        for (let x = 0; x < size; x += halfStep) {
            for (let y = (x + halfStep) % step; y < size; y += step) {
                let total = 0;
                let count = 0;

                if (x >= halfStep) { total += grid[x - halfStep][y]; count++ }
                if (x + halfStep < size) { total += grid[x + halfStep][y]; count++ }
                if (y >= halfStep) { total += grid[x][y - halfStep]; count++ }
                if (y + halfStep < size) { total += grid[x][y + halfStep]; count++ }

                grid[x][y] = (total / count) + (Math.random() - 0.5) * scale;
            }
        }

        step = halfStep;
        currentAmplitude *= roughness;
    }
    return grid;
}

function smoothGrid(grid, size, passes = 3) {
    for (let p = 0; p < passes; p++) {
        for (let x = 1; x < size - 1; x++) {
            for (let y = 1; y < size - 1; y++) {
                grid[x][y] = (grid[x][y] + grid[x - 1][y] + grid[x + 1][y] + grid[x][y - 1] + grid[x][y + 1]) / 5;
            }
        }
    }
    return grid;
}

self.onmessage = function (e) {
    const { chunkX, chunkZ, amplitude, chunkSize } = e.data;

    // Obtém o bioma para esta região de chunks
    const biome = getBiomeForRegion(chunkX, chunkZ);

    // Gera o grid com parâmetros do bioma
    const grid = smoothGrid(
        diamondSquare(amplitude, chunkSize, biome.roughness), 
        chunkSize
    );

    self.postMessage({ 
        chunkX, 
        chunkZ, 
        grid, 
        texturebiome: biome.texturePack 
    });
};
