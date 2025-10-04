FROM neo4j:5.15

# Copy custom configuration
COPY neo4j.conf /var/lib/neo4j/conf/neo4j.conf

# Set environment variables
ENV NEO4J_AUTH=neo4j/password123
ENV NEO4J_dbms_memory_pagecache_size=512M
ENV NEO4J_dbms_memory_heap_initial__size=512M
ENV NEO4J_dbms_memory_heap_max__size=512M
ENV NEO4J_apoc_export_file_enabled=true
ENV NEO4J_apoc_import_file_enabled=true
ENV NEO4J_dbms_security_procedures_unrestricted=apoc.*

# Expose ports
EXPOSE 7474 7687

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7474 || exit 1

CMD ["neo4j"]
