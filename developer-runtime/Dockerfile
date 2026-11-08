# Parent supplies pinned image digests after verifying Python 3.12 / Node 26.
ARG NODE_IMAGE
ARG PYTHON_IMAGE
FROM ${NODE_IMAGE} AS node
FROM ${PYTHON_IMAGE}
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    groupadd -g 1000 candidate && useradd -u 1000 -g 1000 -M candidate
COPY requirements.txt requirements-dev.txt /opt/dependencies/
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /opt/dependencies/requirements-dev.txt
COPY ui-sdk/package.json ui-sdk/package-lock.json /opt/keto/
COPY --from=node /usr/lib/x86_64-linux-gnu/libatomic.so.1* /usr/lib/x86_64-linux-gnu/
RUN cd /opt/keto && npm ci --ignore-scripts && npm rebuild esbuild
COPY developer-runtime/build/source.tar.gz developer-runtime/build/manifest.json /opt/keto/
RUN mkdir /opt/keto/source && tar -xzf /opt/keto/source.tar.gz -C /opt/keto/source && \
    chmod -R a-w /opt/keto/source && rm /opt/keto/source.tar.gz
COPY .runtime-fonts/ /opt/fonts/
COPY developer-runtime/runner.py /opt/trusted/runner.py
RUN chmod -R a-w /opt/trusted /opt/fonts /opt/keto/node_modules
EXPOSE 8080
CMD ["/opt/venv/bin/python", "-I", "/opt/trusted/runner.py"]
