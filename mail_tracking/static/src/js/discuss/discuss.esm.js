/** @odoo-module **/

import {attr, many, one} from "@mail/model/model_field";
import {insert} from "@mail/model/model_field_command";
import {registerPatch} from "@mail/model/model_core";

registerPatch(
    {
        name: "Messaging",
        fields: {
            failedmsg: one("Mailbox", {
                default: {},
                inverse: "messagingAsFailedmsg",
            }),
        },
    },
    {
        name: "MessagingInitializer",
        recordMethods: {
            async start() {
                this.messaging.update({
                    failedmsg: insert({
                        id: "failedmsg",
                        isServerPinned: true,
                        model: "mail.box",
                        name: this.env._t("Failed"),
                    }),
                });
                return this._super(...arguments);
            },
            async _init({
                channels,
                companyName,
                current_partner,
                currentGuest,
                current_user_id,
                current_user_settings,
                hasLinkPreviewFeature,
                internalUserGroupId,
                menu_id,
                needaction_inbox_counter = 0,
                partner_root,
                shortcodes = [],
                starred_counter = 0,
                failed_counter = 0,
            }) {
                const discuss = this.messaging.discuss;
                // Partners first because the rest of the code relies on them
                this._initPartners({
                    currentGuest,
                    current_partner,
                    current_user_id,
                    partner_root,
                });
                // Mailboxes after partners and before other initializers that might
                // manipulate threads or messages
                this._initMailboxes({
                    needaction_inbox_counter,
                    starred_counter,
                    failed_counter,
                });
                // Init mail user settings
                if (current_user_settings) {
                    this.messaging.models["res.users.settings"].insert(
                        current_user_settings
                    );
                }
                // Various suggestions in no particular order
                this._initCannedResponses(shortcodes);
                // FIXME: guests should have (at least some) commands available
                if (!this.messaging.isCurrentUserGuest) {
                    this._initCommands();
                }
                // Channels when the rest of messaging is ready
                if (channels) {
                    await this._initChannels(channels);
                }
                if (!this.exists()) {
                    return;
                }
                discuss.update({menu_id});
                // Company related data
                this.messaging.update({
                    companyName,
                    hasLinkPreviewFeature,
                    internalUserGroupId,
                });
            },

            _initMailboxes({
                needaction_inbox_counter,
                starred_counter,
                failed_counter,
            }) {
                this.messaging.inbox.update({counter: needaction_inbox_counter});
                this.messaging.starred.update({counter: starred_counter});
                this.messaging.failedmsg.update({counter: failed_counter});
            },
        },
    },
    {
        name: "ThreadCache",
        recordMethods: {
            _extendMessageDomain(domain) {
                const thread = this.thread;
                if (thread === this.env.messaging.failedmsg) {
                    return domain.concat([["is_failed_message", "=", true]]);
                }
                return this._super(...arguments);
            },
        },
        fields: {},
    },
    {
        name: "Message",
        modelMethods: {
            convertData(data) {
                const data2 = this._super(data);
                if ("is_failed_message" in data) {
                    data2.isFailed = data.is_failed_message;
                }
                return data2;
            },
            _computeThreads() {
                const threads = [];
                if (this.isHistory && this.messaging.history) {
                    threads.push(this.messaging.history);
                }
                if (this.isNeedaction && this.messaging.inbox) {
                    threads.push(this.messaging.inbox);
                }
                if (this.isStarred && this.messaging.starred) {
                    threads.push(this.messaging.starred);
                }
                if (this.isFailed && this.messaging.failedmsg) {
                    threads.push(this.messaging.failedmsg);
                }
                if (this.originThread) {
                    threads.push(this.originThread);
                }
                return threads;
            },
        },
        fields: {
            messagingFailedmsg: many("Thread", {
                related: "messaging.failedmsg",
            }),
            isFailed: attr({
                default: false,
            }),
        },
    }
);
