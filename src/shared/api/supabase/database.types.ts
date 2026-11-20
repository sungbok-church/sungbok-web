// 자동 생성 — `pnpm db:types`. 손으로 고치지 않는다(변경 파일을 고치고 다시 만든다).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "albums": {
                  Row: {
                    "category_group": string,"category_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"id": string,"images_list_id": string,"slug": string,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_group"?: string,"category_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"id"?: string,"images_list_id": string,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "category_group"?: string,"category_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"id"?: string,"images_list_id"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "albums_category_group_category_id_fkey"
      columns: ["category_group","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["group_key","id"]
    },{
      foreignKeyName: "albums_images_list_id_fkey"
      columns: ["images_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": Database["public"]['Enums']["audit_action"],"actor_id": string | null,"at": string,"changes": NonNullable<Json>,"id": number,"parent_id": string | null,"parent_table": string | null,"row_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": Database["public"]['Enums']["audit_action"],"actor_id"?: string | null,"at"?: string,"changes"?: NonNullable<Json>,"id"?: never,"parent_id"?: string | null,"parent_table"?: string | null,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["audit_action"],"actor_id"?: string | null,"at"?: string,"changes"?: NonNullable<Json>,"id"?: never,"parent_id"?: string | null,"parent_table"?: string | null,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bulletins": {
                  Row: {
                    "created_at": string,"created_by": string | null,"date": string,"deleted_at": string | null,"deleted_by": string | null,"id": string,"pages_list_id": string,"status": Database["public"]['Enums']["content_status"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"date": string,"deleted_at"?: string | null,"deleted_by"?: string | null,"id"?: string,"pages_list_id": string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"date"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"id"?: string,"pages_list_id"?: string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bulletins_pages_list_id_fkey"
      columns: ["pages_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"created_by": string | null,"group_key": string,"id": string,"is_active": boolean,"label": string,"slug": string,"sort": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"group_key": string,"id"?: string,"is_active"?: boolean,"label": string,"slug": string,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"group_key"?: string,"id"?: string,"is_active"?: boolean,"label"?: string,"slug"?: string,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_group_key_fkey"
      columns: ["group_key"]
isOneToOne: false
      referencedRelation: "category_groups"
      referencedColumns: ["key"]
    }
                  ]
                },"category_groups": {
                  Row: {
                    "key": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"name": string,"sort"?: number
                  }
                  Update: {
                    "key"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"code_groups": {
                  Row: {
                    "description": string | null,"is_locked": boolean,"key": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_locked"?: boolean,"key": string,"name": string,"sort"?: number
                  }
                  Update: {
                    "description"?: string | null,"is_locked"?: boolean,"key"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"codes": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"group_key": string,"id": string,"is_active": boolean,"label": string,"sort": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"group_key": string,"id"?: string,"is_active"?: boolean,"label": string,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"group_key"?: string,"id"?: string,"is_active"?: boolean,"label"?: string,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "codes_group_key_fkey"
      columns: ["group_key"]
isOneToOne: false
      referencedRelation: "code_groups"
      referencedColumns: ["key"]
    }
                  ]
                },"department_staff": {
                  Row: {
                    "created_at": string,"created_by": string | null,"department_id": string,"greeting": string | null,"id": string,"name": string,"photo_list_id": string | null,"role_group": string,"role_id": string,"sort": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"department_id": string,"greeting"?: string | null,"id"?: string,"name": string,"photo_list_id"?: string | null,"role_group"?: string,"role_id": string,"sort": number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"department_id"?: string,"greeting"?: string | null,"id"?: string,"name"?: string,"photo_list_id"?: string | null,"role_group"?: string,"role_id"?: string,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "department_staff_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_staff_photo_list_id_fkey"
      columns: ["photo_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_staff_role_group_role_id_fkey"
      columns: ["role_group","role_id"]
isOneToOne: false
      referencedRelation: "codes"
      referencedColumns: ["group_key","id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "ages": string,"created_at": string,"created_by": string | null,"extra": string | null,"id": string,"intro": string,"photos_list_id": string,"slug": Database["public"]['Enums']["department_slug"],"tagline": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ages": string,"created_at"?: string,"created_by"?: string | null,"extra"?: string | null,"id"?: string,"intro": string,"photos_list_id": string,"slug": Database["public"]['Enums']["department_slug"],"tagline": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ages"?: string,"created_at"?: string,"created_by"?: string | null,"extra"?: string | null,"id"?: string,"intro"?: string,"photos_list_id"?: string,"slug"?: Database["public"]['Enums']["department_slug"],"tagline"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "departments_photos_list_id_fkey"
      columns: ["photos_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"file_lists": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"menu_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"menu_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"menu_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "file_lists_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id"]
    }
                  ]
                },"files": {
                  Row: {
                    "alt": string | null,"bucket": string,"bytes": number,"created_at": string,"created_by": string | null,"height": number | null,"id": string,"kind": Database["public"]['Enums']["file_kind"],"list_id": string,"original_name": string,"path": string,"sort": number,"updated_at": string,"updated_by": string | null,"variants": Json | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string | null,"bucket": string,"bytes": number,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["file_kind"],"list_id": string,"original_name": string,"path": string,"sort": number,"updated_at"?: string,"updated_by"?: string | null,"variants"?: Json | null,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string | null,"bucket"?: string,"bytes"?: number,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["file_kind"],"list_id"?: string,"original_name"?: string,"path"?: string,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null,"variants"?: Json | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"group_permissions": {
                  Row: {
                    "action": Database["public"]['Enums']["permission_action"],"created_at": string,"created_by": string | null,"group_id": string,"menu_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": Database["public"]['Enums']["permission_action"],"created_at"?: string,"created_by"?: string | null,"group_id": string,"menu_id": string
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["permission_action"],"created_at"?: string,"created_by"?: string | null,"group_id"?: string,"menu_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_permissions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_permissions_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"is_system": boolean,"key": string | null,"name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"key"?: string | null,"name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"key"?: string | null,"name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"home_hero": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["hero_media_kind"],"photo_list_id": string,"singleton": boolean,"updated_at": string,"updated_by": string | null,"youtube_video_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["hero_media_kind"],"photo_list_id": string,"singleton"?: boolean,"updated_at"?: string,"updated_by"?: string | null,"youtube_video_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["hero_media_kind"],"photo_list_id"?: string,"singleton"?: boolean,"updated_at"?: string,"updated_by"?: string | null,"youtube_video_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_hero_photo_list_id_fkey"
      columns: ["photo_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"menus": {
                  Row: {
                    "actions": (Database["public"]['Enums']["permission_action"])[],"area": Database["public"]['Enums']["menu_area"],"created_at": string,"created_by": string | null,"default_label": string,"id": string,"is_active": boolean,"is_locked": boolean,"key": string,"label": string | null,"parent_id": string | null,"path": string | null,"sort": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actions"?: (Database["public"]['Enums']["permission_action"])[],"area": Database["public"]['Enums']["menu_area"],"created_at"?: string,"created_by"?: string | null,"default_label": string,"id"?: string,"is_active"?: boolean,"is_locked"?: boolean,"key": string,"label"?: string | null,"parent_id"?: string | null,"path"?: string | null,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "actions"?: (Database["public"]['Enums']["permission_action"])[],"area"?: Database["public"]['Enums']["menu_area"],"created_at"?: string,"created_by"?: string | null,"default_label"?: string,"id"?: string,"is_active"?: boolean,"is_locked"?: boolean,"key"?: string,"label"?: string | null,"parent_id"?: string | null,"path"?: string | null,"sort"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "menus_parent_id_area_fkey"
      columns: ["parent_id","area"]
isOneToOne: false
      referencedRelation: "menus"
      referencedColumns: ["id","area"]
    }
                  ]
                },"newcomers": {
                  Row: {
                    "consent_at": string,"consent_version": string,"created_at": string,"handled_at": string | null,"handled_by": string | null,"id": string,"intent": Database["public"]['Enums']["newcomer_intent"],"message": string | null,"name": string,"note": string | null,"phone": string,"status": Database["public"]['Enums']["newcomer_status"],"updated_at": string,"updated_by": string | null,"visit_date": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at": string,"consent_version": string,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"intent": Database["public"]['Enums']["newcomer_intent"],"message"?: string | null,"name": string,"note"?: string | null,"phone": string,"status"?: Database["public"]['Enums']["newcomer_status"],"updated_at"?: string,"updated_by"?: string | null,"visit_date"?: string | null
                  }
                  Update: {
                    "consent_at"?: string,"consent_version"?: string,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"intent"?: Database["public"]['Enums']["newcomer_intent"],"message"?: string | null,"name"?: string,"note"?: string | null,"phone"?: string,"status"?: Database["public"]['Enums']["newcomer_status"],"updated_at"?: string,"updated_by"?: string | null,"visit_date"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"news_videos": {
                  Row: {
                    "category_group": string,"category_id": string,"created_at": string,"created_by": string | null,"date": string,"date_from": Database["public"]['Enums']["date_source"],"deleted_at": string | null,"deleted_by": string | null,"description": string | null,"feed": Database["public"]['Enums']["news_feed"],"id": string,"legacy_id": string | null,"poster": string | null,"status": Database["public"]['Enums']["content_status"],"thumbnail": string | null,"title": string,"updated_at": string,"updated_by": string | null,"video_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_group"?: never,"category_id": string,"created_at"?: string,"created_by"?: string | null,"date": string,"date_from"?: Database["public"]['Enums']["date_source"],"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"feed": Database["public"]['Enums']["news_feed"],"id"?: string,"legacy_id"?: string | null,"poster"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"thumbnail"?: string | null,"title": string,"updated_at"?: string,"updated_by"?: string | null,"video_id"?: string | null
                  }
                  Update: {
                    "category_group"?: never,"category_id"?: string,"created_at"?: string,"created_by"?: string | null,"date"?: string,"date_from"?: Database["public"]['Enums']["date_source"],"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"feed"?: Database["public"]['Enums']["news_feed"],"id"?: string,"legacy_id"?: string | null,"poster"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"thumbnail"?: string | null,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"video_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "news_videos_category_group_category_id_fkey"
      columns: ["category_group","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["group_key","id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"department": Database["public"]['Enums']["department_slug"] | null,"email": string,"id": string,"is_active": boolean,"must_change_password": boolean,"name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"department"?: Database["public"]['Enums']["department_slug"] | null,"email": string,"id": string,"is_active"?: boolean,"must_change_password"?: boolean,"name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"department"?: Database["public"]['Enums']["department_slug"] | null,"email"?: string,"id"?: string,"is_active"?: boolean,"must_change_password"?: boolean,"name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"resource_videos": {
                  Row: {
                    "created_at": string,"created_by": string | null,"resource_id": string,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"resource_id": string,"video_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"resource_id"?: string,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resource_videos_resource_id_fkey"
      columns: ["resource_id"]
isOneToOne: false
      referencedRelation: "resources"
      referencedColumns: ["id"]
    }
                  ]
                },"resources": {
                  Row: {
                    "created_at": string,"created_by": string | null,"date": string | null,"deleted_at": string | null,"deleted_by": string | null,"episode": number | null,"file_list_id": string | null,"id": string,"pages_list_id": string,"passage": string | null,"section": Database["public"]['Enums']["resource_section"],"series_group": string,"series_id": string,"slug": string,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"updated_by": string | null,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"date"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"episode"?: number | null,"file_list_id"?: string | null,"id"?: string,"pages_list_id": string,"passage"?: string | null,"section": Database["public"]['Enums']["resource_section"],"series_group"?: never,"series_id": string,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"updated_by"?: string | null,"year"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"date"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"episode"?: number | null,"file_list_id"?: string | null,"id"?: string,"pages_list_id"?: string,"passage"?: string | null,"section"?: Database["public"]['Enums']["resource_section"],"series_group"?: never,"series_id"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "resources_file_list_id_fkey"
      columns: ["file_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_pages_list_id_fkey"
      columns: ["pages_list_id"]
isOneToOne: true
      referencedRelation: "file_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_series_group_series_id_fkey"
      columns: ["series_group","series_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["group_key","id"]
    }
                  ]
                },"submission_attempts": {
                  Row: {
                    "at": string,"id": number,"key_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"id"?: never,"key_hash": string
                  }
                  Update: {
                    "at"?: string,"id"?: never,"key_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_groups": {
                  Row: {
                    "created_at": string,"created_by": string | null,"group_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"group_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"group_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_groups_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_groups_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "actor_names":
{ Args: { "p_ids": (string)[] }; Returns: {
              "id": string,"name": string
            }[]
                           },
"can_manage_user":
{ Args: { "p_target": string }; Returns: boolean
                           },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: {
              "action": Database["public"]['Enums']["permission_action"],"menu_key": string
            }[]
                           },
"newcomer_notify_emails":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"orphan_storage_objects":
{ Args: { "p_limit"?: number }; Returns: string[]
                           },
"purge_expired":
{ Args: Record<PropertyKey, never>; Returns: Json
                           }
          }
          Enums: {
            "audit_action": "INSERT"|"UPDATE"|"DELETE"|"EXPORT","content_status": "DRAFT"|"PUBLISHED","date_source": "EVENT"|"UPLOAD","department_slug": "INFANT"|"KINDERGARTEN"|"LOWER_ELEMENTARY"|"ELEMENTARY"|"MIDDLE"|"HIGH"|"YOUNG_ADULT"|"ENGLISH","file_kind": "IMAGE"|"PDF"|"HWP","hero_media_kind": "PHOTO"|"YOUTUBE","menu_area": "ADMIN"|"SITE","newcomer_intent": "REGISTER"|"INQUIRY","newcomer_status": "NEW"|"CONTACTED"|"DONE","news_feed": "ANNOUNCEMENTS"|"GARDEN","permission_action": "READ"|"CREATE"|"UPDATE"|"DELETE"|"PURGE"|"EXPORT"|"HISTORY","resource_section": "SUNDAY"|"SERIES"|"SEASONAL"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "audit_action": ["INSERT", "UPDATE", "DELETE", "EXPORT"],"content_status": ["DRAFT", "PUBLISHED"],"date_source": ["EVENT", "UPLOAD"],"department_slug": ["INFANT", "KINDERGARTEN", "LOWER_ELEMENTARY", "ELEMENTARY", "MIDDLE", "HIGH", "YOUNG_ADULT", "ENGLISH"],"file_kind": ["IMAGE", "PDF", "HWP"],"hero_media_kind": ["PHOTO", "YOUTUBE"],"menu_area": ["ADMIN", "SITE"],"newcomer_intent": ["REGISTER", "INQUIRY"],"newcomer_status": ["NEW", "CONTACTED", "DONE"],"news_feed": ["ANNOUNCEMENTS", "GARDEN"],"permission_action": ["READ", "CREATE", "UPDATE", "DELETE", "PURGE", "EXPORT", "HISTORY"],"resource_section": ["SUNDAY", "SERIES", "SEASONAL"]
          }
        }
} as const
