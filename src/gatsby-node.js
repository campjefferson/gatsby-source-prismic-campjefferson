import createNodeHelpers from 'gatsby-node-helpers';
import fetchData from './fetch';
import { normalizeFields } from './normalize';

const nodeHelpers = createNodeHelpers({ typePrefix: 'Prismic' });
const { createNodeFactory } = nodeHelpers;

export const sourceNodes = async (gatsby, pluginOptions) => {
  const { actions, createNodeId, store, cache } = gatsby;
  const { createNode, touchNode } = actions;
  const {
    repositoryName,
    apiOptions,
    accessToken,
    linkResolver = () => {},
    htmlSerializer = () => {},
    fetchLinks = [],
    lang = '*',
    shouldNormalizeImage = () => true,
    nodeModifier = node => {
      return node;
    },
    onSourceNodesComplete = null
  } = pluginOptions;

  const { documents } = await fetchData({
    repositoryName,
    accessToken,
    apiOptions,
    fetchLinks,
    lang
  });

  await Promise.all(
    documents.map(async doc => {
      const Node = createNodeFactory(doc.type, async node => {
        const originalNode = node;
        if (nodeModifier) {
          node = nodeModifier(node);
          if (!node) {
            console.warn(
              'node not returned from nodeModifier method! using original node ...'
            );
            node = originalNode;
          }
        }
        node.dataString = JSON.stringify(node.data);
        node.data = await normalizeFields({
          value: node.data,
          node,
          linkResolver,
          htmlSerializer,
          nodeHelpers,
          createNode,
          createNodeId,
          touchNode,
          store,
          cache,
          shouldNormalizeImage
        });

        return node;
      });

      const node = await Node(doc);
      createNode(node);
    })
  );
  if (onSourceNodesComplete && typeof onSourceNodesComplete === 'function') {
    onSourceNodesComplete();
  }
  return;
};
