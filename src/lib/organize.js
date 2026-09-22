import { supabase } from './supabase'

const C = 'id,name,color,position,created_at'

export const org = {
  collections: () => supabase.from('collections').select(C).order('position').order('created_at'),
  linkCollections: () => supabase.from('link_collections').select('link_id,collection_id'),
  tags: () => supabase.from('tags').select('id,name').order('name'),
  linkTags: () => supabase.from('link_tags').select('link_id,tag_id'),

  createCollection: (row) => supabase.from('collections').insert(row).select(C).single(),
  updateCollection: (id, patch) => supabase.from('collections').update(patch).eq('id', id),
  deleteCollection: (id) => supabase.from('collections').delete().eq('id', id),

  addToCollection: (link_id, collection_id) => supabase.from('link_collections').insert({ link_id, collection_id }),
  removeFromCollection: (link_id, collection_id) =>
    supabase.from('link_collections').delete().eq('link_id', link_id).eq('collection_id', collection_id),

  createTag: (name) => supabase.from('tags').insert({ name }).select('id,name').single(),
  addTag: (link_id, tag_id) => supabase.from('link_tags').insert({ link_id, tag_id }),
  removeTag: (link_id, tag_id) => supabase.from('link_tags').delete().eq('link_id', link_id).eq('tag_id', tag_id),

  updateLink: (id, patch) => supabase.from('links').update(patch).eq('id', id),
}
