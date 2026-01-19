const api = require('./api.js');
const request = api.default || api;

const base = '/api/cooperative';

const cooperativeTripApi = {
  getById: (id, userId) => {
    const url = userId ? `${base}/trips/${id}?userId=${userId}` : `${base}/trips/${id}`;
    return request({ url, method: 'GET' });
  },
  complete: (id, userId) => {
    const url = userId ? `${base}/trips/${id}/complete?userId=${userId}` : `${base}/trips/${id}/complete`;
    return request({ url, method: 'POST' });
  },
  listByUser: (userId) => request({ url: `${base}/trips/user/${userId}`, method: 'GET' }),
  create: (data) => request({ url: `${base}/trips`, method: 'POST', data }),
  rename: (id, data) => request({ url: `${base}/trips/${id}/name`, method: 'PATCH', data }),
  updateImg: (id, data) => request({ url: `${base}/trips/${id}/img`, method: 'PATCH', data }),
  delete: (id, userId) => request({ url: `${base}/trips/${id}?userId=${userId}`, method: 'DELETE' }),
  getMemberProgress: (tripId, status) => request({
    url: `${base}/trips/${tripId}/members`,
    method: 'GET',
    params: status ? { status } : {}
  }),
  listMembers: (tripId) => request({ url: `${base}/trips/${tripId}/members/basic`, method: 'GET' }),
  previewInvite: (params) => request({
    url: `${base}/trips/join/preview`,
    method: 'GET',
    data: params
  }),
  applyJoin: (data) => request({
    url: `${base}/trips/join/apply`,
    method: 'POST',
    data
  }),
  generateInviteQr: (id, userId) => request({
    url: `${base}/trips/${id}/invite/qrcode?userId=${userId}`,
    method: 'POST'
  }),
  generateInviteCode: (id, userId, code) => request({
    url: `${base}/trips/${id}/invite/code?userId=${userId}`,
    method: 'POST',
    data: { code }
  }),
  generateWechatInvite: (id, userId) => request({
    url: `${base}/trips/${id}/invite/wechat?userId=${userId}`,
    method: 'POST'
  }),
  updateMemberAvatar: (tripId, data) => request({
    url: `${base}/trips/${tripId}/members/avatar`,
    method: 'PATCH',
    data
  })
};

const cooperativeItemApi = {
  listByTrip: (tripId, userId) => {
    const url = userId ? `${base}/items/trip/${tripId}?userId=${userId}` : `${base}/items/trip/${tripId}`;
    return request({ url, method: 'GET' });
  },
  add: (data) => request({ url: `${base}/items`, method: 'POST', data }),
  updateChecked: (id, data = {}) => request({
    url: `${base}/items/${id}/check`,
    method: 'PUT',
    data
  }),
  delete: (id) => request({ url: `${base}/items/${id}`, method: 'DELETE' }),
  resetChecked: (tripId, userId) => {
    const url = userId ? `${base}/items/trip/${tripId}/checked/reset?userId=${userId}` : `${base}/items/trip/${tripId}/checked/reset`;
    return request({ url, method: 'DELETE' });
  },
  deleteCheckRecord: (itemId, userId) => {
    const url = `${base}/items/${itemId}/check?userId=${userId}`;
    return request({ url, method: 'DELETE' });
  }
};

module.exports = {
  cooperativeTripApi,
  cooperativeItemApi
};

