# Checked-in test inventory

Source enumeration only; these suites were not executed by SPEC-AUDIT-07.
Python parametrization and dynamically constructed Node cases are not expanded.
Test names identify intent, not measured line/branch coverage or a current PASS.

## tests/test_edge_bridge.py

[Source](../../tests/test_edge_bridge.py) · python functions, before parametrization.

- `test_bridge_absent_by_default` ([L23](../../tests/test_edge_bridge.py#L23))
- `test_signature_replay_and_only_nonce_persisted` ([L27](../../tests/test_edge_bridge.py#L27))
- `test_tamper_expiry_wrong_identity_and_payload_bound` ([L31](../../tests/test_edge_bridge.py#L31))
- `test_state_and_chat_stay_in_memory` ([L37](../../tests/test_edge_bridge.py#L37))
- `test_pillow_rejects_fake_and_strips_exif` ([L41](../../tests/test_edge_bridge.py#L41))
- `test_blob_replay_reservation_is_atomic_create_and_prune_is_prefix_only` ([L47](../../tests/test_edge_bridge.py#L47))
- `test_bridge_blocks_cli_model_tempfile_mode` ([L70](../../tests/test_edge_bridge.py#L70))
- `test_untrusted_source_is_context_not_user_profile_proposal` ([L77](../../tests/test_edge_bridge.py#L77))
- `test_prompt_does_not_assume_adult` ([L86](../../tests/test_edge_bridge.py#L86))
- `test_nonurgent_literal_safety_does_not_consume_model_quota` ([L90](../../tests/test_edge_bridge.py#L90))

## tests/test_edge_candidate.py

[Source](../../tests/test_edge_candidate.py) · python functions, before parametrization.

- `test_signed_readonly_memory_state` ([L20](../../tests/test_edge_candidate.py#L20))
- `test_fail_closed_invalid_envelopes` ([L23](../../tests/test_edge_candidate.py#L23))
- `test_body_tampering_and_replay` ([L25](../../tests/test_edge_candidate.py#L25))
- `test_cross_subject_and_unsafe_operation_rejected` ([L29](../../tests/test_edge_candidate.py#L29))
- `test_memory_execution_does_not_write_personal_state` ([L35](../../tests/test_edge_candidate.py#L35))

## tests/test_edge_ed25519.py

[Source](../../tests/test_edge_ed25519.py) · python functions, before parametrization.

- `test_ed25519_accepts_and_replay_refused` ([L20](../../tests/test_edge_ed25519.py#L20))
- `test_ed25519_tamper_wrong_key_expiry_and_wrong_algorithm` ([L26](../../tests/test_edge_ed25519.py#L26))
- `test_public_key_configuration_fails_closed` ([L34](../../tests/test_edge_ed25519.py#L34))
- `test_cannot_enable_both_algorithms` ([L38](../../tests/test_edge_ed25519.py#L38))
- `test_http_route_uses_public_configuration` ([L42](../../tests/test_edge_ed25519.py#L42))

## tests/test_kitchen.py

[Source](../../tests/test_kitchen.py) · python functions, before parametrization.

- `test_three_distinct_new_calculated_templates_no_hidden_extras` ([L21](../../tests/test_kitchen.py#L21))
- `test_modes_and_missing_gram_delta` ([L35](../../tests/test_kitchen.py#L35))
- `test_alias_unknown_raw_cooked_count_and_frozen` ([L43](../../tests/test_kitchen.py#L43))
- `test_pantry_confirm_revision_and_shared_chat` ([L53](../../tests/test_kitchen.py#L53))
- `test_missing_model_replay_and_changed_payload_not_billed_twice` ([L62](../../tests/test_kitchen.py#L62))
- `test_save_half_and_topic_ids_confirmed_only` ([L66](../../tests/test_kitchen.py#L66))
- `test_preference_forget_canonical_and_quotes_never_resurrect` ([L80](../../tests/test_kitchen.py#L80))
- `test_own_history_retrieval_delete_and_malicious_quote` ([L89](../../tests/test_kitchen.py#L89))
- `test_raw_poultry_temperature_equipment_and_time` ([L99](../../tests/test_kitchen.py#L99))
- `test_allergy_exclusion_and_safety_hold` ([L106](../../tests/test_kitchen.py#L106))
- `test_injected_model_rejected_honest_fallback` ([L114](../../tests/test_kitchen.py#L114))
- `test_sol_schema_route_usage_and_one_call` ([L128](../../tests/test_kitchen.py#L128))
- `test_consent_changed_during_designer_result_discarded` ([L136](../../tests/test_kitchen.py#L136))
- `test_day_global_inventory_no_reused_egg_grams_and_targets` ([L143](../../tests/test_kitchen.py#L143))
- `test_verified_food_unknown_nutrients_not_zero` ([L152](../../tests/test_kitchen.py#L152))
- `test_json_export_includes_memory_pantry_candidates_and_topic_delete` ([L159](../../tests/test_kitchen.py#L159))
- `test_evidence_retrieved_only_included` ([L165](../../tests/test_kitchen.py#L165))
- `test_spec_bounds` ([L170](../../tests/test_kitchen.py#L170))
- `test_full_day_deterministic_acceptance_export_import_roundtrip` ([L174](../../tests/test_kitchen.py#L174))
- `test_intent_and_recipe_usage_added_and_deadline_bounded` ([L186](../../tests/test_kitchen.py#L186))
- `test_legacy_authenticated_tool_and_schema` ([L199](../../tests/test_kitchen.py#L199))
- `test_quantity_parsing_does_not_borrow_neighbor_grams` ([L211](../../tests/test_kitchen.py#L211))
- `test_forget_removes_core_dislike_and_preserves_unrelated` ([L215](../../tests/test_kitchen.py#L215))
- `test_overlapping_preferences_forget_all_does_not_leave_hidden_excludes` ([L222](../../tests/test_kitchen.py#L222))
- `test_constraints_change_invalidates_replay_and_drafts_without_rebilling` ([L228](../../tests/test_kitchen.py#L228))
- `test_pantry_fact_has_confirmation_origin_and_legacy_preferences_are_editable` ([L235](../../tests/test_kitchen.py#L235))

## tests/test_kitchen_appliances.py

[Source](../../tests/test_kitchen_appliances.py) · python functions, before parametrization.

- `test_real_appliance_specific_templates` ([L20](../../tests/test_kitchen_appliances.py#L20))
- `test_chat_selects_explicit_appliance` ([L33](../../tests/test_kitchen_appliances.py#L33))
- `test_two_appliances_require_selection` ([L39](../../tests/test_kitchen_appliances.py#L39))
- `test_pressure_mode_not_guessed` ([L44](../../tests/test_kitchen_appliances.py#L44))
- `test_wrong_method_or_raw_chicken_in_waffle_rejected` ([L49](../../tests/test_kitchen_appliances.py#L49))

## tests/test_kitchen_parent.py

[Source](../../tests/test_kitchen_parent.py) · python functions, before parametrization.

- `test_quantities_bind_to_own_ingredient_and_decimal_comma` ([L18](../../tests/test_kitchen_parent.py#L18))
- `test_no_cheese_does_not_mean_no_raw_meat` ([L22](../../tests/test_kitchen_parent.py#L22))
- `test_confirmed_preference_is_shared_and_forgotten_in_recent_context` ([L27](../../tests/test_kitchen_parent.py#L27))
- `test_diary_summary_uses_confirmed_fraction_and_counts_unknown` ([L34](../../tests/test_kitchen_parent.py#L34))
- `test_chat_full_day_confirmation_and_pdf` ([L41](../../tests/test_kitchen_parent.py#L41))
- `test_unknown_pantry_meal_does_not_throw` ([L45](../../tests/test_kitchen_parent.py#L45))
- `test_no_protein_vegetable_candidate_is_not_presented_as_full_dinner` ([L48](../../tests/test_kitchen_parent.py#L48))

## tests/test_kitchen_release.py

[Source](../../tests/test_kitchen_release.py) · python functions, before parametrization.

- `test_raw_adjective_is_not_cheese` ([L14](../../tests/test_kitchen_release.py#L14))
- `test_actual_cheese_still_needs_kind` ([L18](../../tests/test_kitchen_release.py#L18))
- `test_explicit_purchase_count_is_honored` ([L21](../../tests/test_kitchen_release.py#L21))
- `test_yogurt_method_needs_yogurt_not_any_cheese` ([L29](../../tests/test_kitchen_release.py#L29))
- `test_counted_oil_is_explicit_in_steps` ([L35](../../tests/test_kitchen_release.py#L35))

## tests/test_mobile.py

[Source](../../tests/test_mobile.py) · python functions, before parametrization.

- `test_topic_migration_and_context` ([L16](../../tests/test_mobile.py#L16))
- `test_topic_limits_and_explicit_confirmation` ([L25](../../tests/test_mobile.py#L25))
- `test_shared_preference_survives_topic_delete` ([L31](../../tests/test_mobile.py#L31))
- `test_temporary_recipe_filters` ([L34](../../tests/test_mobile.py#L34))
- `test_unknown_food_ids_never_invented` ([L41](../../tests/test_mobile.py#L41))
- `test_hard_allergy_and_followup_choice` ([L45](../../tests/test_mobile.py#L45))
- `test_pdf_actual_cyrillic_private_and_gated` ([L48](../../tests/test_mobile.py#L48))
- `test_pdf_missing_fonts_explicit` ([L58](../../tests/test_mobile.py#L58))
- `test_reminders_ownership_edit_complete_and_ics` ([L62](../../tests/test_mobile.py#L62))
- `test_reminder_bad_values` ([L68](../../tests/test_mobile.py#L68))
- `test_reminder_dst` ([L70](../../tests/test_mobile.py#L70))
- `test_real_ffmpeg_signal_silence_and_duration` ([L78](../../tests/test_mobile.py#L78))
- `test_transcriber_fixed_metadata_and_limit` ([L82](../../tests/test_mobile.py#L82))
- `test_transcript_receipt_never_stores_audio_or_text` ([L86](../../tests/test_mobile.py#L86))
- `test_transcription_consent_revocation` ([L89](../../tests/test_mobile.py#L89))
- `test_speech_provider_failure_and_decode_no_paid_call` ([L94](../../tests/test_mobile.py#L94))
- `test_topic_delete_removes_request_replies_and_memory_cap` ([L97](../../tests/test_mobile.py#L97))
- `test_reminder_oneoff_future_and_early_completion` ([L101](../../tests/test_mobile.py#L101))
- `test_remember_dislike_is_proposed_and_only_confirmed_values_persist` ([L103](../../tests/test_mobile.py#L103))
- `test_temporary_boredom_cannot_propose_permanent_exclusion` ([L106](../../tests/test_mobile.py#L106))
- `test_ics_utf8_folding_and_injection` ([L109](../../tests/test_mobile.py#L109))
- `test_legacy_mcp_cannot_execute_unadvertised_mobile_actions` ([L113](../../tests/test_mobile.py#L113))
- `test_actual_supported_audio_container_decoding` ([L122](../../tests/test_mobile.py#L122))
- `test_pdf_bridge_omits_duplicate_personal_state_to_keep_response_bounded` ([L127](../../tests/test_mobile.py#L127))

## tests/test_mobile_parent_review.py

[Source](../../tests/test_mobile_parent_review.py) · python functions, before parametrization.

- `test_transcription_uses_verified_deployment_route` ([L7](../../tests/test_mobile_parent_review.py#L7))
- `test_api_version_cannot_inject_route` ([L28](../../tests/test_mobile_parent_review.py#L28))
- `test_pdf_food_states_are_human_readable` ([L33](../../tests/test_mobile_parent_review.py#L33))
- `test_nonfragmented_mp4_seekable_ram_without_audio_files` ([L39](../../tests/test_mobile_parent_review.py#L39))

## tests/test_oauth_bridge.py

[Source](../../tests/test_oauth_bridge.py) · python functions, before parametrization.

- `test_metadata_and_end_to_end` ([L42](../../tests/test_oauth_bridge.py#L42))
- `test_disabled_default` ([L56](../../tests/test_oauth_bridge.py#L56))
- `test_authorize_rejects_before_storage` ([L61](../../tests/test_oauth_bridge.py#L61))
- `test_denial_iss_state_and_no_replay` ([L64](../../tests/test_oauth_bridge.py#L64))
- `test_same_transaction_complete_once_and_uninvited` ([L67](../../tests/test_oauth_bridge.py#L67))
- `test_exchange_verifier_bindings_replay` ([L71](../../tests/test_oauth_bridge.py#L71))
- `test_expired_code_and_transaction` ([L77](../../tests/test_oauth_bridge.py#L77))
- `test_refresh_rotation_replay_expiry_and_revocation` ([L81](../../tests/test_oauth_bridge.py#L81))
- `test_cross_user_isolation` ([L89](../../tests/test_oauth_bridge.py#L89))
- `test_malformed_oversized_origin_and_duplicate_fields` ([L94](../../tests/test_oauth_bridge.py#L94))
- `test_concurrent_redemption_single_winner` ([L102](../../tests/test_oauth_bridge.py#L102))
- `test_access_and_refresh_expiry` ([L108](../../tests/test_oauth_bridge.py#L108))
- `test_mcp_media_types_and_protocol` ([L113](../../tests/test_oauth_bridge.py#L113))
- `test_installed_mcp_client_with_asgi_transport` ([L119](../../tests/test_oauth_bridge.py#L119))
- `test_anonymous_authorize_is_bounded_and_nonpersistent` ([L135](../../tests/test_oauth_bridge.py#L135))
- `test_refresh_race_single_winner` ([L141](../../tests/test_oauth_bridge.py#L141))
- `test_write_failure_never_returns_code` ([L147](../../tests/test_oauth_bridge.py#L147))
- `test_capacity_and_expired_cleanup` ([L153](../../tests/test_oauth_bridge.py#L153))
- `test_missing_or_wrong_origin_cannot_complete` ([L163](../../tests/test_oauth_bridge.py#L163))
- `test_bridge_misconfiguration_fails_closed` ([L169](../../tests/test_oauth_bridge.py#L169))
- `test_refresh_client_resource_scope_bindings` ([L175](../../tests/test_oauth_bridge.py#L175))
- `test_bridge_rejects_storage_namespace_collision` ([L181](../../tests/test_oauth_bridge.py#L181))
- `test_chunked_oauth_body_stops_at_limit` ([L186](../../tests/test_oauth_bridge.py#L186))
- `test_revoke_current_token_family` ([L202](../../tests/test_oauth_bridge.py#L202))
- `test_revoke_previously_rotated_token` ([L208](../../tests/test_oauth_bridge.py#L208))
- `test_revoke_invalid_tokens_and_wrong_client_do_not_revoke` ([L213](../../tests/test_oauth_bridge.py#L213))
- `test_random_refresh_does_not_revoke_but_reuse_does` ([L221](../../tests/test_oauth_bridge.py#L221))
- `test_revocation_tombstone_releases_subject_capacity` ([L228](../../tests/test_oauth_bridge.py#L228))
- `test_revoke_preserves_global_cap` ([L237](../../tests/test_oauth_bridge.py#L237))
- `test_rotation_bound_never_discards_history` ([L245](../../tests/test_oauth_bridge.py#L245))
- `test_concurrent_revoke_and_refresh_revoke_family` ([L253](../../tests/test_oauth_bridge.py#L253))
- `test_revoke_metadata_and_unknown_token_no_write` ([L263](../../tests/test_oauth_bridge.py#L263))
- `test_reuse_revokes_even_if_subject_temporarily_removed` ([L269](../../tests/test_oauth_bridge.py#L269))
- `test_legacy_grant_tombstone_keeps_safe_expiry` ([L275](../../tests/test_oauth_bridge.py#L275))
- `test_maximum_history_fits_document_bound` ([L280](../../tests/test_oauth_bridge.py#L280))

## tests/test_planning.py

[Source](../../tests/test_planning.py) · python functions, before parametrization.

- `test_golden_and_explicit_save` ([L21](../../tests/test_planning.py#L21))
- `test_loss_and_rounding` ([L25](../../tests/test_planning.py#L25))
- `test_bad_number` ([L28](../../tests/test_planning.py#L28))
- `test_decimal_comma_and_missing_no_defaults` ([L30](../../tests/test_planning.py#L30))
- `test_scope_fail_closed` ([L33](../../tests/test_planning.py#L33))
- `test_clinical_flags` ([L36](../../tests/test_planning.py#L36))
- `test_unknown_medication_and_hold` ([L38](../../tests/test_planning.py#L38))
- `test_bmi_edges_loss_and_floor` ([L40](../../tests/test_planning.py#L40))
- `test_stage_resume_and_goal_mode_reload` ([L46](../../tests/test_planning.py#L46))
- `test_baseline_pipeline_no_consent_no_save` ([L50](../../tests/test_planning.py#L50))
- `test_stale_cross_user_and_manual_preserved` ([L55](../../tests/test_planning.py#L55))
- `test_manual_existing_and_name_only` ([L65](../../tests/test_planning.py#L65))
- `test_actual_two_profiles_no_handwritten_targets` ([L69](../../tests/test_planning.py#L69))
- `test_net_manual_and_review_rules` ([L81](../../tests/test_planning.py#L81))
- `test_goal_or_mode_change_makes_computed_targets_stale_without_overwriting` ([L85](../../tests/test_planning.py#L85))
- `test_male_manual_floor_and_untrusted_candidate` ([L88](../../tests/test_planning.py#L88))
- `test_calorie_chat_is_canonical_and_not_model_generated_even_at_model_cap` ([L92](../../tests/test_planning.py#L92))

## tests/test_portion_search.py

[Source](../../tests/test_portion_search.py) · python functions, before parametrization.

- `test_keto_one_day_from_actual_setup_without_manual_calories` ([L13](../../tests/test_portion_search.py#L13))
- `test_starter_second_profile_from_setup` ([L21](../../tests/test_portion_search.py#L21))
- `test_portion_search_never_erases_exclusions_or_changes_targets` ([L25](../../tests/test_portion_search.py#L25))
- `test_missing_nutrient_is_not_zero` ([L31](../../tests/test_portion_search.py#L31))

## tests/test_service.py

[Source](../../tests/test_service.py) · python functions, before parametrization.

- `test_baseline_catalog` ([L36](../../tests/test_service.py#L36))
- `test_key_validation` ([L38](../../tests/test_service.py#L38))
- `test_storage_cas` ([L40](../../tests/test_service.py#L40))
- `test_no_data_written_before_consent` ([L46](../../tests/test_service.py#L46))
- `test_read_recipes_no_consent` ([L48](../../tests/test_service.py#L48))
- `test_unknown_screening_not_healthy` ([L49](../../tests/test_service.py#L49))
- `test_no_plan_without_targets` ([L50](../../tests/test_service.py#L50))
- `test_ui_reject_invalid` ([L54](../../tests/test_service.py#L54))
- `test_propose_not_apply` ([L56](../../tests/test_service.py#L56))
- `test_apply_idempotent` ([L58](../../tests/test_service.py#L58))
- `test_cancel` ([L60](../../tests/test_service.py#L60))
- `test_revision_conflict` ([L62](../../tests/test_service.py#L62))
- `test_atomic_configuration` ([L65](../../tests/test_service.py#L65))
- `test_rollback_ui` ([L69](../../tests/test_service.py#L69))
- `test_diary_add_delete` ([L71](../../tests/test_service.py#L71))
- `test_allergy_filter` ([L73](../../tests/test_service.py#L73))
- `test_forged_medication_review` ([L75](../../tests/test_service.py#L75))
- `test_help_live_not_fabricated` ([L78](../../tests/test_service.py#L78))
- `test_request_replay` ([L80](../../tests/test_service.py#L80))
- `test_request_in_flight` ([L83](../../tests/test_service.py#L83))
- `test_revoke_during_inference` ([L88](../../tests/test_service.py#L88))
- `test_model_unavailable` ([L91](../../tests/test_service.py#L91))
- `test_model_preferences_no_auto_commit` ([L93](../../tests/test_service.py#L93))
- `test_model_mixed_atomic` ([L95](../../tests/test_service.py#L95))
- `test_model_arbitrary_code_not_executed` ([L97](../../tests/test_service.py#L97))
- `test_feature_request_not_done` ([L99](../../tests/test_service.py#L99))
- `test_model_no_false_profile` ([L101](../../tests/test_service.py#L101))
- `test_model_profile_proposal` ([L103](../../tests/test_service.py#L103))
- `test_safety_fastpath` ([L106](../../tests/test_service.py#L106))
- `test_negation_not_urgent` ([L108](../../tests/test_service.py#L108))
- `test_daily_cap` ([L110](../../tests/test_service.py#L110))
- `test_delete_owned_data` ([L113](../../tests/test_service.py#L113))
- `test_export_after_revoke` ([L115](../../tests/test_service.py#L115))
- `test_healthy_plan` ([L117](../../tests/test_service.py#L117))
- `test_pending_allergy_blocks` ([L119](../../tests/test_service.py#L119))
- `test_unauthorized` ([L122](../../tests/test_service.py#L122))
- `test_cookie_csrf` ([L126](../../tests/test_service.py#L126))
- `test_evil_origin` ([L129](../../tests/test_service.py#L129))
- `test_host_validation` ([L131](../../tests/test_service.py#L131))
- `test_login_bruteforce` ([L133](../../tests/test_service.py#L133))
- `test_tools_types` ([L137](../../tests/test_service.py#L137))
- `test_mcp_initialize` ([L141](../../tests/test_service.py#L141))
- `test_mcp_tools` ([L142](../../tests/test_service.py#L142))
- `test_mcp_open` ([L144](../../tests/test_service.py#L144))
- `test_mcp_no_cookie_auth` ([L146](../../tests/test_service.py#L146))
- `test_mcp_invalid_params` ([L148](../../tests/test_service.py#L148))
- `test_mcp_bad_json` ([L150](../../tests/test_service.py#L150))
- `test_mcp_unsupported_get` ([L152](../../tests/test_service.py#L152))
- `test_security_headers` ([L154](../../tests/test_service.py#L154))
- `test_image_reject` ([L157](../../tests/test_service.py#L157))
- `test_image_reencoded` ([L159](../../tests/test_service.py#L159))
- `test_strict_model_response` ([L163](../../tests/test_service.py#L163))
- `test_model_wrong_shape` ([L165](../../tests/test_service.py#L165))
- `test_expired_profile_proposal_can_be_cancelled_and_does_not_block` ([L169](../../tests/test_service.py#L169))
- `test_new_hold_invalidates_menu_proposal_and_exports` ([L177](../../tests/test_service.py#L177))
- `test_stale_plan_export_blocked` ([L183](../../tests/test_service.py#L183))
- `test_urgent_ignores_limit_brain_and_storage_failure` ([L189](../../tests/test_service.py#L189))
- `test_invalid_model_output_marks_reserved_request_failed` ([L195](../../tests/test_service.py#L195))
- `test_urgent_with_bad_image` ([L202](../../tests/test_service.py#L202))
- `test_confirmation_capability_hidden_and_single_use` ([L205](../../tests/test_service.py#L205))
- `test_payload_bounds_bad_import_and_metadata` ([L210](../../tests/test_service.py#L210))
- `test_production_storage_fails_closed` ([L215](../../tests/test_service.py#L215))
- `test_entra_rejects_bad_claims` ([L223](../../tests/test_service.py#L223))
- `test_entra_accepts_invited_identity` ([L237](../../tests/test_service.py#L237))
- `test_apply_revalidates_hold_even_without_revision_change` ([L248](../../tests/test_service.py#L248))
- `test_duplicate_pending_does_not_mark_other_call_failed` ([L254](../../tests/test_service.py#L254))

## tests/test_spec_audit_regressions.py

[Source](../../tests/test_spec_audit_regressions.py) · python functions, before parametrization.

- `test_unquantified_meal_never_becomes_zero_carbohydrate` ([L20](../../tests/test_spec_audit_regressions.py#L20))
- `test_known_subtotal_remains_separate_from_unknown_total` ([L31](../../tests/test_spec_audit_regressions.py#L31))
- `test_saved_shopping_matches_whole_batch_without_double_scaling_nutrition` ([L55](../../tests/test_spec_audit_regressions.py#L55))
- `test_ordinary_single_person_plan_not_scaled` ([L62](../../tests/test_spec_audit_regressions.py#L62))
- `test_ambiguous_historical_batch_is_not_guessed` ([L67](../../tests/test_spec_audit_regressions.py#L67))
- `test_accepted_day_persists_servings_and_shop_quantity` ([L71](../../tests/test_spec_audit_regressions.py#L71))
- `test_all_supported_allergens_are_represented_and_unknown_saved_values_preserved` ([L84](../../tests/test_spec_audit_regressions.py#L84))
- `test_transient_bridge_does_not_claim_local_or_azure_persistence` ([L92](../../tests/test_spec_audit_regressions.py#L92))
- `test_openapi_unsupported_MCP_operations_have_distinct_stable_ids` ([L100](../../tests/test_spec_audit_regressions.py#L100))

## library/skills/keto-companion/tests/test_core.py

[Source](../../library/skills/keto-companion/tests/test_core.py) · python functions, before parametrization.

- `test_catalog_counts` ([L25](../../library/skills/keto-companion/tests/test_core.py#L25))
- `test_recipe_arithmetic` ([L27](../../library/skills/keto-companion/tests/test_core.py#L27))
- `test_invalid_number` ([L38](../../library/skills/keto-companion/tests/test_core.py#L38))
- `test_decimal_comma` ([L40](../../library/skills/keto-companion/tests/test_core.py#L40))
- `test_unknown_food` ([L41](../../library/skills/keto-companion/tests/test_core.py#L41))
- `test_raw_cooked` ([L43](../../library/skills/keto-companion/tests/test_core.py#L43))
- `test_missing_not_zero` ([L45](../../library/skills/keto-companion/tests/test_core.py#L45))
- `test_high_risk_blocks` ([L50](../../library/skills/keto-companion/tests/test_core.py#L50))
- `test_clinician_review` ([L53](../../library/skills/keto-companion/tests/test_core.py#L53))
- `test_unknown_screening` ([L56](../../library/skills/keto-companion/tests/test_core.py#L56))
- `test_urgent` ([L59](../../library/skills/keto-companion/tests/test_core.py#L59))
- `test_child` ([L60](../../library/skills/keto-companion/tests/test_core.py#L60))
- `test_healthy_no_medical_clearance` ([L61](../../library/skills/keto-companion/tests/test_core.py#L61))
- `test_boolean_string` ([L62](../../library/skills/keto-companion/tests/test_core.py#L62))
- `test_sglt2_brand_even_false_class` ([L66](../../library/skills/keto-companion/tests/test_core.py#L66))
- `test_unknown_medication` ([L69](../../library/skills/keto-companion/tests/test_core.py#L69))
- `test_unknown_allergen` ([L70](../../library/skills/keto-companion/tests/test_core.py#L70))
- `test_allergen_filters_actual_ingredients` ([L71](../../library/skills/keto-companion/tests/test_core.py#L71))
- `test_recipe_name_not_used_for_allergen` ([L73](../../library/skills/keto-companion/tests/test_core.py#L73))
- `test_no_default_targets` ([L75](../../library/skills/keto-companion/tests/test_core.py#L75))
- `test_restrictive_target` ([L77](../../library/skills/keto-companion/tests/test_core.py#L77))
- `test_carb_basis_required` ([L80](../../library/skills/keto-companion/tests/test_core.py#L80))
- `test_settings_no_safety_override` ([L83](../../library/skills/keto-companion/tests/test_core.py#L83))
- `test_settings_boolean_typed` ([L85](../../library/skills/keto-companion/tests/test_core.py#L85))
- `test_consent_first` ([L87](../../library/skills/keto-companion/tests/test_core.py#L87))
- `test_cross_account` ([L90](../../library/skills/keto-companion/tests/test_core.py#L90))
- `test_event_confirmation` ([L92](../../library/skills/keto-companion/tests/test_core.py#L92))
- `test_idempotency` ([L94](../../library/skills/keto-companion/tests/test_core.py#L94))
- `test_reused_id_different_payload` ([L99](../../library/skills/keto-companion/tests/test_core.py#L99))
- `test_revision_conflict` ([L102](../../library/skills/keto-companion/tests/test_core.py#L102))
- `test_photo_storage_separate` ([L104](../../library/skills/keto-companion/tests/test_core.py#L104))
- `test_no_code_event` ([L106](../../library/skills/keto-companion/tests/test_core.py#L106))
- `test_no_forged_integration_receipt` ([L108](../../library/skills/keto-companion/tests/test_core.py#L108))
- `test_feedback_is_soft` ([L110](../../library/skills/keto-companion/tests/test_core.py#L110))
- `test_feedback_invalid` ([L114](../../library/skills/keto-companion/tests/test_core.py#L114))
- `test_checklist` ([L116](../../library/skills/keto-companion/tests/test_core.py#L116))
- `test_profile_owner_immutable` ([L119](../../library/skills/keto-companion/tests/test_core.py#L119))
- `test_doc_cas_request` ([L121](../../library/skills/keto-companion/tests/test_core.py#L121))
- `test_utf16_non_bmp` ([L127](../../library/skills/keto-companion/tests/test_core.py#L127))
- `test_doc_missing_revision` ([L132](../../library/skills/keto-companion/tests/test_core.py#L132))
- `test_doc_corrupt` ([L134](../../library/skills/keto-companion/tests/test_core.py#L134))
- `test_doc_stale_hash` ([L136](../../library/skills/keto-companion/tests/test_core.py#L136))
- `test_dst_nonexistent` ([L138](../../library/skills/keto-companion/tests/test_core.py#L138))
- `test_dst_ambiguous` ([L140](../../library/skills/keto-companion/tests/test_core.py#L140))
- `test_dst_explicit_fold` ([L142](../../library/skills/keto-companion/tests/test_core.py#L142))
- `test_ics` ([L147](../../library/skills/keto-companion/tests/test_core.py#L147))
- `test_csv_injection` ([L152](../../library/skills/keto-companion/tests/test_core.py#L152))
- `test_label_us` ([L153](../../library/skills/keto-companion/tests/test_core.py#L153))
- `test_label_eu_no_double_subtract` ([L156](../../library/skills/keto-companion/tests/test_core.py#L156))
- `test_unreadable_label` ([L160](../../library/skills/keto-companion/tests/test_core.py#L160))
- `test_label_unknown_basis` ([L162](../../library/skills/keto-companion/tests/test_core.py#L162))
- `test_excluded_sources` ([L165](../../library/skills/keto-companion/tests/test_core.py#L165))
- `test_journal_missing_not_zero` ([L166](../../library/skills/keto-companion/tests/test_core.py#L166))
- `test_empty_prices` ([L170](../../library/skills/keto-companion/tests/test_core.py#L170))
- `test_cooked_price_not_raw` ([L171](../../library/skills/keto-companion/tests/test_core.py#L171))
- `test_personal_food` ([L173](../../library/skills/keto-companion/tests/test_core.py#L173))
- `test_custom_recipe` ([L179](../../library/skills/keto-companion/tests/test_core.py#L179))
- `test_browse_recipe_without_profile` ([L183](../../library/skills/keto-companion/tests/test_core.py#L183))
- `test_plan_unknown_profile` ([L184](../../library/skills/keto-companion/tests/test_core.py#L184))
- `test_generated_plan_roundtrip` ([L187](../../library/skills/keto-companion/tests/test_core.py#L187))
- `test_import_forged_totals_ignored` ([L198](../../library/skills/keto-companion/tests/test_core.py#L198))
- `test_empty_personal_catalog_hash_stable` ([L205](../../library/skills/keto-companion/tests/test_core.py#L205))
- `test_personal_catalog_no_base_overwrite` ([L208](../../library/skills/keto-companion/tests/test_core.py#L208))
- `test_settings_real_rollback` ([L212](../../library/skills/keto-companion/tests/test_core.py#L212))
- `test_diary_edit_delete` ([L219](../../library/skills/keto-companion/tests/test_core.py#L219))
- `test_ics_uid_injection_block` ([L227](../../library/skills/keto-companion/tests/test_core.py#L227))
- `test_json_forged_totals` ([L230](../../library/skills/keto-companion/tests/test_core.py#L230))
- `test_find_pantry_respects_allergy` ([L236](../../library/skills/keto-companion/tests/test_core.py#L236))
- `test_replacement_recomputes` ([L242](../../library/skills/keto-companion/tests/test_core.py#L242))
- `test_energy_estimate_no_prescription` ([L248](../../library/skills/keto-companion/tests/test_core.py#L248))
- `test_energy_never_assumes_activity` ([L254](../../library/skills/keto-companion/tests/test_core.py#L254))
- `test_minor_baseline_overrides_adult_flag` ([L258](../../library/skills/keto-companion/tests/test_core.py#L258))
- `test_no_baseline_clinical_fields` ([L262](../../library/skills/keto-companion/tests/test_core.py#L262))
- `test_state_missing_collections_rejected` ([L265](../../library/skills/keto-companion/tests/test_core.py#L265))
- `test_state_wrong_profile_owner_rejected` ([L269](../../library/skills/keto-companion/tests/test_core.py#L269))
- `test_state_roundtrip` ([L273](../../library/skills/keto-companion/tests/test_core.py#L273))

## cloudflare-saas/tests/allergy-editor.test.mjs

[Source](../../cloudflare-saas/tests/allergy-editor.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `allergy editor preserves every supported and existing unknown restriction: ` ([L12](../../cloudflare-saas/tests/allergy-editor.test.mjs#L12))

## cloudflare-saas/tests/ed25519-bridge.test.mjs

[Source](../../cloudflare-saas/tests/ed25519-bridge.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `Web Crypto Ed25519 signature is accepted by actual Python verifier` ([L5](../../cloudflare-saas/tests/ed25519-bridge.test.mjs#L5))

## cloudflare-saas/tests/firebase-flow.test.mjs

[Source](../../cloudflare-saas/tests/firebase-flow.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `Firebase popup starts synchronously on click, exchanges only in body, then signs out` ([L3](../../cloudflare-saas/tests/firebase-flow.test.mjs#L3))
- `Firebase popup ` ([L4](../../cloudflare-saas/tests/firebase-flow.test.mjs#L4))

## cloudflare-saas/tests/kitchen.test.mjs

[Source](../../cloudflare-saas/tests/kitchen.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `Kitchen tool dispatcher, labels, memory route and strict mode identities` ([L8](../../cloudflare-saas/tests/kitchen.test.mjs#L8))
- `Studio keeps secondary reference library, four tabs and mobile minimum widths` ([L13](../../cloudflare-saas/tests/kitchen.test.mjs#L13))
- `Studio has no public deployment/model setting, model numbers or paid search on product input` ([L19](../../cloudflare-saas/tests/kitchen.test.mjs#L19))
- `chat and memory confirmations remain visible and numbers accept decimal comma` ([L23](../../cloudflare-saas/tests/kitchen.test.mjs#L23))
- `Owner appliances have explicit choices and accessible model-specific hints` ([L25](../../cloudflare-saas/tests/kitchen.test.mjs#L25))

## cloudflare-saas/tests/media.test.mjs

[Source](../../cloudflare-saas/tests/media.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `recorder is user started, auto stops at 60s, releases tracks and prepares draft only` ([L4](../../cloudflare-saas/tests/media.test.mjs#L4))
- `recorder cancel stops tracks and ignores pending transcription` ([L5](../../cloudflare-saas/tests/media.test.mjs#L5))
- `permission denial is clear and cancellation of permission stops late stream` ([L6](../../cloudflare-saas/tests/media.test.mjs#L6))
- `image decoding compresses to JPEG and closes bitmap; unsupported format gives useful error` ([L7](../../cloudflare-saas/tests/media.test.mjs#L7))
- `default browser timer functions retain global receiver` ([L9](../../cloudflare-saas/tests/media.test.mjs#L9))

## cloudflare-saas/tests/setup.test.mjs

[Source](../../cloudflare-saas/tests/setup.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `admin/member first run and partial users resume actual stage; ready users retain route` ([L2](../../cloudflare-saas/tests/setup.test.mjs#L2))
- `routing has nested Back/Forward, bounded tab pushes and no route data calls` ([L3](../../cloudflare-saas/tests/setup.test.mjs#L3))
- `comma parsing and large step controls do not invent untouched values` ([L4](../../cloudflare-saas/tests/setup.test.mjs#L4))
- `real slider adapter synchronizes typed/user changes and destroys handlers; no save or recalculation` ([L5](../../cloudflare-saas/tests/setup.test.mjs#L5))
- `knowledge excludes retracted support and differentiates product assumptions` ([L6](../../cloudflare-saas/tests/setup.test.mjs#L6))
- `reviewed calorie slider zooms without changing typed values` ([L8](../../cloudflare-saas/tests/setup.test.mjs#L8))

## cloudflare-saas/tests/static.test.mjs

[Source](../../cloudflare-saas/tests/static.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `standalone client sends session CSRF and clears previous private content` ([L3](../../cloudflare-saas/tests/static.test.mjs#L3))
- `bundled Worker embeds standalone assets without binding` ([L12](../../cloudflare-saas/tests/static.test.mjs#L12))
- `modular bundle references separately packaged text assets` ([L15](../../cloudflare-saas/tests/static.test.mjs#L15))
- `PWA manifest and PNG icons are served as actual files from text modules` ([L18](../../cloudflare-saas/tests/static.test.mjs#L18))

## cloudflare-saas/tests/worker.test.mjs

[Source](../../cloudflare-saas/tests/worker.test.mjs) · literal named Node registrations; dynamic cases not expanded.

- `fail closed and public assets independent of missing credentials` ([L41](../../cloudflare-saas/tests/worker.test.mjs#L41))
- `OIDC owner bootstrap only for verified fixed email` ([L42](../../cloudflare-saas/tests/worker.test.mjs#L42))
- `Google rejects ` ([L43](../../cloudflare-saas/tests/worker.test.mjs#L43))
- `Google rejects invalid JWT signature and state replay` ([L44](../../cloudflare-saas/tests/worker.test.mjs#L44))
- `invitation single use, expiry, revocation, and email binding` ([L45](../../cloudflare-saas/tests/worker.test.mjs#L45))
- `CSRF, logout and suspended user sessions` ([L46](../../cloudflare-saas/tests/worker.test.mjs#L46))
- `sources are private, bounded and never fetched; admin sees no content` ([L47](../../cloudflare-saas/tests/worker.test.mjs#L47))
- `private uploads type and size validation and deletion` ([L48](../../cloudflare-saas/tests/worker.test.mjs#L48))
- `deletion begins with a receipt and revokes the session` ([L49](../../cloudflare-saas/tests/worker.test.mjs#L49))
- `an upload cannot commit after consent is revoked or user suspended` ([L50](../../cloudflare-saas/tests/worker.test.mjs#L50))
- `link preview does not consume invitation; revocation before claim blocks it` ([L54](../../cloudflare-saas/tests/worker.test.mjs#L54))
- `admin cannot read a different person diary, and expired session fails` ([L57](../../cloudflare-saas/tests/worker.test.mjs#L57))
- `source quota is enforced inside the insertion` ([L61](../../cloudflare-saas/tests/worker.test.mjs#L61))
- `live session count is bounded and expired sessions are cleaned` ([L64](../../cloudflare-saas/tests/worker.test.mjs#L64))
- `local Worker-to-Python flow saves isolated chat, diary and recipes without duplicate paid call` ([L70](../../cloudflare-saas/tests/worker.test.mjs#L70))
- `consent revocation during model call discards response and prevents duplicate charge` ([L83](../../cloudflare-saas/tests/worker.test.mjs#L83))
- `suspension during model call blocks the commit` ([L89](../../cloudflare-saas/tests/worker.test.mjs#L89))
- `deletion retries R2 failure, revokes sessions and deletes only owner prefix` ([L96](../../cloudflare-saas/tests/worker.test.mjs#L96))
- `deletion waits for in-flight upload and removes it after cancellation` ([L106](../../cloudflare-saas/tests/worker.test.mjs#L106))
- `screening and agreed targets gate an actual synthetic menu and shopping calculation` ([L115](../../cloudflare-saas/tests/worker.test.mjs#L115))
- `urgent message bypasses missing bridge and daily quota` ([L128](../../cloudflare-saas/tests/worker.test.mjs#L128))
- `source discussion is explicit, owner-scoped and keeps source untrusted` ([L131](../../cloudflare-saas/tests/worker.test.mjs#L131))
- `in-flight duplicate chat is rejected and charged once` ([L136](../../cloudflare-saas/tests/worker.test.mjs#L136))
- `unknown upstream effect is not replayed with same request ID` ([L141](../../cloudflare-saas/tests/worker.test.mjs#L141))
- `maximum daily quota prevents model call but urgent response still works` ([L145](../../cloudflare-saas/tests/worker.test.mjs#L145))
- `urgent message invalidates an in-flight response and marks the current plan held` ([L149](../../cloudflare-saas/tests/worker.test.mjs#L149))
- `image upload fails closed with no sanitizer and preserves no object or reservation` ([L154](../../cloudflare-saas/tests/worker.test.mjs#L154))
- `ambiguous unfinished upload keeps deletion pending` ([L157](../../cloudflare-saas/tests/worker.test.mjs#L157))
- `browser cannot forge bridge source context` ([L160](../../cloudflare-saas/tests/worker.test.mjs#L160))
- `source-backed personal recipe is previewed, allergen checked and saved only after approval` ([L161](../../cloudflare-saas/tests/worker.test.mjs#L161))
- `local safety response is not counted as a model call` ([L174](../../cloudflare-saas/tests/worker.test.mjs#L174))
- `health is public and incomplete Firebase configuration remains closed` ([L177](../../cloudflare-saas/tests/worker.test.mjs#L177))
- `global and member compute limits reject model requests before bridge` ([L180](../../cloudflare-saas/tests/worker.test.mjs#L180))
- `Firebase owner session uses verified Google subject; public config excludes other fields` ([L196](../../cloudflare-saas/tests/worker.test.mjs#L196))
- `Firebase rejects ` ([L199](../../cloudflare-saas/tests/worker.test.mjs#L199))
- `Firebase rejects incorrect signature, direct Google token, origin, wrong cookie, expired and replayed challenges` ([L200](../../cloudflare-saas/tests/worker.test.mjs#L200))
- `Firebase invitations require matching email and retain existing direct identity` ([L207](../../cloudflare-saas/tests/worker.test.mjs#L207))
- `Firebase challenge limit retains consumed attempts and trusts only CF IP` ([L212](../../cloudflare-saas/tests/worker.test.mjs#L212))
- `Firebase global challenge cap and bounded token body` ([L213](../../cloudflare-saas/tests/worker.test.mjs#L213))
- `Firebase certificate cache respects fixed endpoint and TTL` ([L214](../../cloudflare-saas/tests/worker.test.mjs#L214))
- `transcription authenticates, reserves quota and stores neither audio nor transcript; replay is explicit` ([L215](../../cloudflare-saas/tests/worker.test.mjs#L215))
- `transcription result is discarded if consent changes during recognition; rejected decode is not charged` ([L221](../../cloudflare-saas/tests/worker.test.mjs#L221))
- `transcription quotas, consent, CSRF and provider error accounting fail closed` ([L226](../../cloudflare-saas/tests/worker.test.mjs#L226))
- `topic deletion preserves profile, removes messages and invalidates cached old replies` ([L233](../../cloudflare-saas/tests/worker.test.mjs#L233))
- `expired session while transcribing discards private output` ([L242](../../cloudflare-saas/tests/worker.test.mjs#L242))
- `PDF bridge response does not replace existing private state or persist file bytes in jobs` ([L246](../../cloudflare-saas/tests/worker.test.mjs#L246))
- `guidance status is role-neutral, requires explicit baseline confirmation and never calls a paid model` ([L250](../../cloudflare-saas/tests/worker.test.mjs#L250))
- `Kitchen shares bridge state, own pantry confirmation and replay; admin cannot select another member` ([L261](../../cloudflare-saas/tests/worker.test.mjs#L261))
- `Kitchen paid generation reserves both quotas before call; replay, consent/session revocation and cap` ([L277](../../cloudflare-saas/tests/worker.test.mjs#L277))
- `SPEC-AUDIT: calculate wording cannot bypass paid recipe reservation` ([L299](../../cloudflare-saas/tests/worker.test.mjs#L299))
- `SPEC-AUDIT: verified no-model chat result refunds reserved quota` ([L312](../../cloudflare-saas/tests/worker.test.mjs#L312))

## Additional commands and browser fixtures

- [Legacy UI source contracts](../../tests/test_ui_no_browser.cjs).
- [Legacy OAuth UI contracts](../../tests/test_oauth_ui.cjs).
- [Mobile browser scenarios](../../tests/browser/mobile.spec.mjs): not run here.
- [Setup browser scenarios](../../tests/browser/setup.spec.mjs): not run here.
- [Browser journey](../../tests/browser_journey.py): not run here.
- [Live model evaluation](../../tests/live_model_eval.py): not run here; paid/network boundary.
- [This review probes](review_probes.py): four synthetic observations, not a full suite.
