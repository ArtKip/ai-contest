
/**
 * JavaScript Functions for Vector Operations
 * 
 * This file contains utility functions for working with vectors,
 * similarity calculations, and mathematical operations commonly
 * used in machine learning and data science applications.
 */

// Vector similarity calculation using cosine similarity
function calculateCosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0; // Avoid division by zero
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
}

// Calculate Euclidean distance between two vectors
function calculateEuclideanDistance(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same dimensions');
    }
    
    let sumOfSquares = 0;
    for (let i = 0; i < vectorA.length; i++) {
        const diff = vectorA[i] - vectorB[i];
        sumOfSquares += diff * diff;
    }
    
    return Math.sqrt(sumOfSquares);
}

// Normalize a vector to unit length
function normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
        return vector.slice(); // Return copy of zero vector
    }
    
    return vector.map(val => val / magnitude);
}

// Calculate dot product of two vectors
function dotProduct(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same dimensions');
    }
    
    return vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
}

// Find the most similar vectors to a query vector
function findMostSimilar(queryVector, vectorDatabase, topK = 5) {
    const similarities = vectorDatabase.map((vector, index) => ({
        index,
        vector,
        similarity: calculateCosineSimilarity(queryVector, vector.data || vector)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top K results
    return similarities.slice(0, topK);
}

// Example usage and demonstration
function demonstrateVectorOperations() {
    const vector1 = [1, 2, 3, 4, 5];
    const vector2 = [2, 4, 6, 8, 10];
    const vector3 = [1, 0, 0, 0, 0];
    
    console.log('Vector Operations Demo:');
    console.log('Vector 1:', vector1);
    console.log('Vector 2:', vector2);
    console.log('Vector 3:', vector3);
    
    console.log('\nSimilarity Calculations:');
    console.log('Cosine Similarity (1,2):', calculateCosineSimilarity(vector1, vector2));
    console.log('Cosine Similarity (1,3):', calculateCosineSimilarity(vector1, vector3));
    
    console.log('\nDistance Calculations:');
    console.log('Euclidean Distance (1,2):', calculateEuclideanDistance(vector1, vector2));
    console.log('Euclidean Distance (1,3):', calculateEuclideanDistance(vector1, vector3));
    
    console.log('\nNormalized Vectors:');
    console.log('Normalized Vector 1:', normalizeVector(vector1));
    console.log('Normalized Vector 2:', normalizeVector(vector2));
}

module.exports = {
    calculateCosineSimilarity,
    calculateEuclideanDistance,
    normalizeVector,
    dotProduct,
    findMostSimilar,
    demonstrateVectorOperations
};
